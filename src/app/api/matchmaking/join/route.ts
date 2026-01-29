import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/matchmaking/join
 * Join the matchmaking queue or find a match
 */
export async function POST(request: NextRequest) {
  try {
    const { playerId, role } = await request.json();
    
    if (!playerId || !role) {
      return NextResponse.json({ error: 'Missing playerId or role' }, { status: 400 });
    }
    
    // Clean up stale queue entries (older than 1 minute)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    await prisma.matchmakingQueue.deleteMany({
      where: {
        createdAt: { lt: oneMinuteAgo },
      },
    });
    
    // Abandon any old unfinished games for this player (older than 2 min)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    await prisma.game.updateMany({
      where: {
        OR: [
          { interrogatorId: playerId },
          { humanPlayerId: playerId },
        ],
        status: { in: ['IN_PROGRESS', 'GUESSING', 'WAITING'] },
        createdAt: { lt: twoMinutesAgo },
      },
      data: { status: 'FINISHED' },
    });
    
    // Remove any existing queue entry for this player (fresh start)
    await prisma.matchmakingQueue.deleteMany({
      where: { playerId },
    });
    
    // Look for a player with the opposite role
    const oppositeRole = role === 'INTERROGATOR' ? 'HUMAN' : 'INTERROGATOR';
    
    const match = await prisma.matchmakingQueue.findFirst({
      where: { role: oppositeRole },
      orderBy: { createdAt: 'asc' },
    });
    
    if (match) {
      // Found a match! Create a game
      const humanSlot = Math.random() < 0.5 ? 'A' : 'B';
      
      const game = await prisma.game.create({
        data: {
          status: 'IN_PROGRESS',
          currentRound: 1,
          humanSlot,
          interrogatorId: role === 'INTERROGATOR' ? playerId : match.playerId,
          humanPlayerId: role === 'HUMAN' ? playerId : match.playerId,
        },
      });
      
      // Remove matched player from queue
      await prisma.matchmakingQueue.delete({
        where: { id: match.id },
      });
      
      return NextResponse.json({
        status: 'matched',
        gameId: game.id,
        humanSlot,
        yourRole: role,
      });
    } else {
      // No match found, add to queue
      await prisma.matchmakingQueue.create({
        data: { playerId, role },
      });
      
      return NextResponse.json({ status: 'waiting', message: 'Added to queue' });
    }
  } catch (error) {
    console.error('Matchmaking error:', error);
    return NextResponse.json({ error: 'Matchmaking failed' }, { status: 500 });
  }
}

/**
 * DELETE /api/matchmaking/join
 * Leave the matchmaking queue
 */
export async function DELETE(request: NextRequest) {
  try {
    const { playerId } = await request.json();
    
    await prisma.matchmakingQueue.deleteMany({
      where: { playerId },
    });
    
    return NextResponse.json({ status: 'left' });
  } catch (error) {
    console.error('Leave queue error:', error);
    return NextResponse.json({ error: 'Failed to leave queue' }, { status: 500 });
  }
}
