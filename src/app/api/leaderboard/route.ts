import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/leaderboard
 * Get top players sorted by total score
 */
export async function GET() {
  try {
    const entries = await prisma.user.findMany({
      where: {
        gamesPlayed: { gt: 0 },
      },
      orderBy: {
        totalScore: 'desc',
      },
      take: 50,
      select: {
        id: true,
        username: true,
        totalScore: true,
        gamesPlayed: true,
        gamesWon: true,
      },
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ entries: [] });
  }
}
