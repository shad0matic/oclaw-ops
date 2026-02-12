
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';

const querySchema = z.object({
  days: z.coerce.number().int().positive().optional().default(30),
  taskType: z.string().optional(),
  model: z.string().optional(),
  tier: z.coerce.number().int().min(1).max(5).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const validatedQuery = querySchema.safeParse({
      days: searchParams.get('days'),
      taskType: searchParams.get('taskType'),
      model: searchParams.get('model'),
      tier: searchParams.get('tier'),
    });

    if (!validatedQuery.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: validatedQuery.error.flatten() }, { status: 400 });
    }

    const { days, taskType, model, tier } = validatedQuery.data;

    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - days);

    let whereClauses = [`tr.created_at >= $1`];
    let params: any[] = [dateFilter];
    let paramIndex = 2;

    if (taskType) {
      whereClauses.push(`tr.task_type = $${paramIndex++}`);
      params.push(taskType);
    }
    if (model) {
      whereClauses.push(`tr.model_alias = $${paramIndex++}`);
      params.push(model);
    }
    if (tier) {
      whereClauses.push(`tr.tier = $${paramIndex++}`);
      params.push(tier);
    }

    const whereSql = whereClauses.join(' AND ');

    const dailyData: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        DATE(tr.created_at) AS date,
        SUM(tr.estimated_cost_usd) AS "estimatedCost",
        SUM(tr.cost_usd) AS "actualCost"
      FROM ops.task_runs tr
      WHERE ${whereSql}
      GROUP BY DATE(tr.created_at)
      ORDER BY DATE(tr.created_at) ASC;
    `, ...params);

    const accuracyData: any[] = await prisma.$queryRawUnsafe(`
        SELECT
            DATE(tr.created_at) AS date,
            AVG(ce.accuracy_pct) AS "averageAccuracy"
        FROM ops.task_runs tr
        JOIN ops.cost_estimates ce ON tr.id = ce.task_run_id
        WHERE ${whereSql}
        GROUP BY DATE(tr.created_at)
        ORDER BY DATE(tr.created_at) ASC;
    `, ...params);


    const costByTier: any[] = await prisma.$queryRawUnsafe(`
        SELECT
            DATE(tr.created_at) AS date,
            tr.tier,
            SUM(tr.cost_usd) AS "totalCost"
        FROM ops.task_runs tr
        WHERE ${whereSql}
        GROUP BY DATE(tr.created_at), tr.tier
        ORDER BY DATE(tr.created_at) ASC, tr.tier ASC;
    `, ...params);

    const totalTasks = await prisma.task_runs.count({
        where: {
            created_at: { gte: dateFilter },
            ...(taskType && { task_type: taskType }),
            ...(model && { model_alias: model }),
            ...(tier && { tier: tier }),
        }
    });

    const totalCost = await prisma.task_runs.aggregate({
        _sum: { cost_usd: true },
        where: {
            created_at: { gte: dateFilter },
            ...(taskType && { task_type: taskType }),
            ...(model && { model_alias: model }),
            ...(tier && { tier: tier }),
        }
    });

    const avgAccuracy = await prisma.cost_estimates.aggregate({
        _avg: { accuracy_pct: true },
        where: {
            created_at: { gte: dateFilter },
        }
    });

    // TODO: This needs a proper calculation based on a reference model price
    const estimatedSavings = 0; 

    const distinctTaskTypes = await prisma.task_runs.findMany({
        select: { task_type: true },
        distinct: ['task_type'],
        where: { task_type: { not: null } }
    });

    const distinctModels = await prisma.task_runs.findMany({
        select: { model_alias: true },
        distinct: ['model_alias'],
        where: { model_alias: { not: null } }
    });

    return NextResponse.json({
        dailyData: dailyData.map(d => ({ ...d, estimatedCost: Number(d.estimatedCost), actualCost: Number(d.actualCost) })),
        accuracyData: accuracyData.map(d => ({ ...d, averageAccuracy: Number(d.averageAccuracy) })),
        costByTier,
        summaryStats: {
            totalTasks,
            totalCost: totalCost._sum.cost_usd ?? 0,
            averageAccuracy: avgAccuracy._avg.accuracy_pct ?? 0,
            estimatedSavings,
        },
        filters: {
            taskTypes: distinctTaskTypes.map(t => t.task_type),
            models: distinctModels.map(m => m.model_alias),
        }
    });
  } catch (error) {
    console.error('Failed to fetch cost learning data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
