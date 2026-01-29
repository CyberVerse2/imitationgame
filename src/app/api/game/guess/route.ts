import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateScore } from '@/lib/scoring';

/**
 * POST /api/game/guess
 * Submit the interrogator's guess
 */
export async function POST(request: NextRequest) {
  try {
    const { gameId, playerId, guess, roundsUsed } = await request.json();
    
    if (!gameId || !playerId || !guess) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });
    
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    
    if (game.interrogatorId !== playerId) {
      return NextResponse.json({ error: 'Not the interrogator' }, { status: 403 });
    }
    
    const isCorrect = guess === game.humanSlot;
    
    // Calculate score with bonuses
    const score = calculateScore(
      isCorrect,
      0,  // timeRemaining (not tracked yet)
      roundsUsed || game.currentRound,  // rounds used
      0   // streak (not tracked yet)
    );
    
    // Update game status
    await prisma.game.update({
      where: { id: gameId },
      data: { status: 'FINISHED' },
    });
    
    return NextResponse.json({
      isCorrect,
      humanSlot: game.humanSlot,
      score,
    });
  } catch (error) {
    console.error('Guess error:', error);
    return NextResponse.json({ error: 'Failed to process guess' }, { status: 500 });
  }
}
