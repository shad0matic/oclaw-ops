
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30', 10);

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days);

    const dailyCosts = await prisma.cost_snapshots.groupBy({
      by: ['recorded_at'],
      where: {
        recorded_at: {
          gte: thirtyDaysAgo,
        },
        non_fixed_cost_eur: {
          gt: 0,
        },
      },
      _sum: {
        non_fixed_cost_eur: true,
      },
      orderBy: {
        recorded_at: 'asc',
      },
    });

    let cumulative = 0;
    const dailyData = dailyCosts.map(item => {
        const cost = Number(item._sum.non_fixed_cost_eur);
        cumulative += cost;
        return {
            date: item.recorded_at.toISOString().split('T')[0],
            cost,
            cumulative,
        };
    });
    
    const total = cumulative;

    const daysElapsed = (new Date().getTime() - thirtyDaysAgo.getTime()) / (1000 * 3600 * 24);
    const projected = (total / daysElapsed) * 30;

    let tier: 'green' | 'orange' | 'red' = 'green';
    if (total > 100) {
      tier = 'red';
    } else if (total > 10) {
      tier = 'orange';
    }

    return NextResponse.json({
      total,
      daily: dailyData,
      projected,
      tier,
    });
  } catch (error) {
    console.error('Failed to fetch variable costs:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
