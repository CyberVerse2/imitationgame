import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/matchmaking/search
 * Find waiting games for human players to join
 */
export async function GET(request: NextRequest) {
  try {
    // Look for games with status WAITING that have an interrogator but no human
    const waitingGames = await prisma.game.findMany({
      where: {
        status: 'WAITING',
        interrogatorId: { not: null },
        humanPlayerId: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        createdAt: true,
        interrogatorId: true,
      }
    });

    return NextResponse.json({ games: waitingGames });
  } catch (error) {
    console.error('Search games error:', error);
    return NextResponse.json({ error: 'Failed to search for games' }, { status: 500 });
  }
}
