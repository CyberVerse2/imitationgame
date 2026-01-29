import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/matchmaking/join
 * Join the matchmaking queue or find a match
 */
export async function POST(request: NextRequest) {
  try {
    const { playerId, role, gameId } = await request.json();
    
    if (!playerId || !role) {
      return NextResponse.json({ error: 'Missing playerId or role' }, { status: 400 });
    }
    
    // 1. Cleanup stale WAITING games (older than 5 minutes)
    // This handles "ghost games" where interrogators left the waiting screen
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await prisma.game.deleteMany({
      where: {
        status: 'WAITING',
        createdAt: { lt: fiveMinutesAgo },
      },
    });

    if (role === 'INTERROGATOR') {
      // Check for existing active game for this interrogator
      const existingGame = await prisma.game.findFirst({
        where: {
          interrogatorId: playerId,
          status: { in: ['WAITING', 'IN_PROGRESS', 'GUESSING'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingGame) {
        // If they already have a waiting or active game, just return it
        return NextResponse.json({
          status: existingGame.status === 'WAITING' ? 'waiting' : 'matched',
          gameId: existingGame.id,
          humanSlot: existingGame.humanSlot,
          yourRole: 'INTERROGATOR',
        });
      }

      // Create a new waiting game
      const game = await prisma.game.create({
        data: {
          status: 'WAITING',
          interrogatorId: playerId,
          totalRounds: 3,
          humanSlot: Math.random() < 0.5 ? 'A' : 'B', // Pre-assign the human slot
        },
      });

      return NextResponse.json({
        status: 'waiting',
        gameId: game.id,
        yourRole: 'INTERROGATOR',
      });
    } else if (role === 'HUMAN') {
      if (!gameId) {
        return NextResponse.json({ error: 'Human must provide a gameId to join' }, { status: 400 });
      }

      // Atomically join the game
      try {
        const game = await prisma.game.update({
          where: {
            id: gameId,
            status: 'WAITING',
            humanPlayerId: null,
          },
          data: {
            status: 'IN_PROGRESS',
            humanPlayerId: playerId,
            currentRound: 1,
          },
        });

        return NextResponse.json({
          status: 'matched',
          gameId: game.id,
          humanSlot: game.humanSlot,
          yourRole: 'HUMAN',
        });
      } catch (error) {
        // Prisma error if game not found or doesn't match where clause
        return NextResponse.json({ error: 'Game no longer available' }, { status: 410 });
      }
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  } catch (error) {
    console.error('Matchmaking join error:', error);
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
    
    if (!playerId) {
      return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });
    }

    // Delete any waiting games for this interrogator
    const deleted = await prisma.game.deleteMany({
      where: {
        interrogatorId: playerId,
        status: 'WAITING',
      },
    });
    
    return NextResponse.json({ status: 'left', gamesCancelled: deleted.count });
  } catch (error) {
    console.error('Leave queue error:', error);
    return NextResponse.json({ error: 'Failed to leave queue' }, { status: 500 });
  }
}
