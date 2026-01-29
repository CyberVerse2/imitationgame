import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/user/stats
 * Update user stats after a game
 */
export async function POST(request: NextRequest) {
  try {
    const { playerId, won, score } = await request.json();
    
    if (!playerId) {
      return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });
    }
    
    const user = await prisma.user.update({
      where: { id: playerId },
      data: {
        gamesPlayed: { increment: 1 },
        gamesWon: won ? { increment: 1 } : undefined,
        totalScore: { increment: score || 0 },
      },
    });
    
    return NextResponse.json({
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      totalScore: user.totalScore,
    });
  } catch (error) {
    console.error('Update stats error:', error);
    return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
  }
}
