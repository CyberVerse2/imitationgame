import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTuringResponse } from '@/lib/turing';

/**
 * POST /api/game/message
 * Submit a message (question from interrogator or answer from human)
 */
export async function POST(request: NextRequest) {
  try {
    const { gameId, playerId, round, content, type } = await request.json();
    
    if (!gameId || !playerId || !round || !content || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });
    
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    
    if (type === 'question') {
      // Interrogator is asking a question
      if (game.interrogatorId !== playerId) {
        return NextResponse.json({ error: 'Not the interrogator' }, { status: 403 });
      }
      
      // Save the question
      await prisma.message.create({
        data: {
          gameId,
          round,
          sender: 'interrogator',
          content,
          isRevealed: true,
        },
      });
      
      // Update game round if needed
      await prisma.game.update({
        where: { id: gameId },
        data: { currentRound: round },
      });
      
      return NextResponse.json({ status: 'question_sent' });
      
    } else if (type === 'answer') {
      // Human is submitting their answer
      if (game.humanPlayerId !== playerId) {
        return NextResponse.json({ error: 'Not the human player' }, { status: 403 });
      }
      
      // Determine which slot the human is in
      const humanSlot = game.humanSlot;
      const humanSender = humanSlot === 'A' ? 'participantA' : 'participantB';
      const turingSlot = humanSlot === 'A' ? 'participantB' : 'participantA';
      
      // Get the question for this round
      const questionMessage = await prisma.message.findFirst({
        where: { gameId, round, sender: 'interrogator' },
      });
      
      if (!questionMessage) {
        return NextResponse.json({ error: 'Question not found' }, { status: 404 });
      }
      
      // Get conversation history for context
      const previousMessages = await prisma.message.findMany({
        where: { 
          gameId, 
          round: { lt: round },
          sender: { in: ['interrogator', turingSlot] },
        },
        orderBy: { createdAt: 'asc' },
      });
      
      const history = previousMessages.map((m: { sender: string; content: string }) => ({
        role: m.sender === 'interrogator' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }));
      
      // Generate Turing's response FIRST (before saving anything)
      let turingResponse: string;
      try {
        turingResponse = await getTuringResponse(questionMessage.content, content, history);
      } catch (turingError) {
        console.error('Turing API error:', turingError);
        // Fallback: Generate a simple mirrored response
        turingResponse = content.length < 20 
          ? "hmm not sure" 
          : "that's a good question actually";
      }
      
      // Save both answers at once (transaction-like)
      await prisma.message.createMany({
        data: [
          {
            gameId,
            round,
            sender: humanSender,
            content,
            isRevealed: true,  // Reveal immediately
          },
          {
            gameId,
            round,
            sender: turingSlot,
            content: turingResponse,
            isRevealed: true,  // Reveal immediately
          },
        ],
      });
      
      return NextResponse.json({ status: 'round_complete' });
    }
    
    return NextResponse.json({ error: 'Invalid message type' }, { status: 400 });
  } catch (error) {
    console.error('Message error:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}

/**
 * GET /api/game/message
 * Poll for messages in the current round
 */
export async function GET(request: NextRequest) {
  try {
    const gameId = request.nextUrl.searchParams.get('gameId');
    const round = parseInt(request.nextUrl.searchParams.get('round') || '1');
    
    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
    }
    
    const messages = await prisma.message.findMany({
      where: { gameId, round },
      orderBy: { createdAt: 'asc' },
    });
    
    const question = messages.find((m: { sender: string }) => m.sender === 'interrogator');
    const participantA = messages.find((m: { sender: string; isRevealed: boolean }) => m.sender === 'participantA' && m.isRevealed);
    const participantB = messages.find((m: { sender: string; isRevealed: boolean }) => m.sender === 'participantB' && m.isRevealed);
    
    return NextResponse.json({
      question: question?.content || null,
      participantA: participantA?.content || null,
      participantB: participantB?.content || null,
      bothRevealed: !!(participantA && participantB),
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Failed to get messages' }, { status: 500 });
  }
}
