import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/user/register
 * Register a new user or get existing user
 */
export async function POST(request: NextRequest) {
  try {
    const { playerId, username } = await request.json();
    
    if (!playerId) {
      return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });
    }
    
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { id: playerId },
    });
    
    if (user) {
      // Update username if provided
      if (username && username !== user.username) {
        user = await prisma.user.update({
          where: { id: playerId },
          data: { username },
        });
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          id: playerId,
          username: username || null,
        },
      });
    }
    
    return NextResponse.json({
      id: user.id,
      username: user.username,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      totalScore: user.totalScore,
    });
  } catch (error) {
    console.error('User registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}

/**
 * GET /api/user/register
 * Get user by ID
 */
export async function GET(request: NextRequest) {
  try {
    const playerId = request.nextUrl.searchParams.get('playerId');
    
    if (!playerId) {
      return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: playerId },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      id: user.id,
      username: user.username,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      totalScore: user.totalScore,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}
