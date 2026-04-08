import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { requireWorkspacePermission } from '@/lib/require-auth';
import { db } from '@/lib/db';
import { infrastructureRecords } from '@/lib/db/schema';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const result = await requireWorkspacePermission(req, 'infraestrutura.view', {
    moduleSlug: 'infraestrutura',
    action: 'view',
    requiredRole: 'user',
  });
  if (result.response) return result.response;

  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const city = searchParams.get('city');
    const technician = searchParams.get('technician');

    const filters = [eq(infrastructureRecords.workspaceId, result.context.workspaceId)];

    if (from) {
      const fromDate = new Date(from);
      const fromVal = fromDate.getFullYear() * 100 + (fromDate.getMonth() + 1);
      filters.push(
        gte(
          sql<number>`${infrastructureRecords.periodYear} * 100 + ${infrastructureRecords.periodMonth}`,
          fromVal
        )
      );
    }

    if (to) {
      const toDate = new Date(to);
      const toVal = toDate.getFullYear() * 100 + (toDate.getMonth() + 1);
      filters.push(
        lte(
          sql<number>`${infrastructureRecords.periodYear} * 100 + ${infrastructureRecords.periodMonth}`,
          toVal
        )
      );
    }

    const baseCondition = filters.length ? and(...filters) : undefined;
    
    // Distinct cities
    const citiesRaw = await db
      .selectDistinct({ cidade: infrastructureRecords.city })
      .from(infrastructureRecords)
      .where(baseCondition);
    const availableCities = citiesRaw
      .map((r) => r.cidade)
      .filter(Boolean)
      .sort((a, b) => (a ?? '').localeCompare(b ?? '', 'pt-BR'));

    // Distinct technicians using COALESCE from jsonb payload
    const techRaw = await db
      .selectDistinct({ 
        tecnico: sql<string>`UPPER(COALESCE(${infrastructureRecords.payload}->>'tecnico', ${infrastructureRecords.payload}->>'TÉCNICO', ${infrastructureRecords.payload}->>'técnico'))` 
      })
      .from(infrastructureRecords)
      .where(baseCondition);
    const availableTechnicians = techRaw
      .map((r) => r.tecnico)
      .filter(Boolean)
      .sort((a, b) => (a ?? '').localeCompare(b ?? '', 'pt-BR'));


    // Apply independent filters
    if (city && city !== 'all') {
      filters.push(eq(infrastructureRecords.city, city));
    }
    
    if (technician && technician !== 'all') {
      filters.push(sql`UPPER(COALESCE(${infrastructureRecords.payload}->>'tecnico', ${infrastructureRecords.payload}->>'TÉCNICO', ${infrastructureRecords.payload}->>'técnico')) = UPPER(${technician})`);
    }

    const condition = filters.length ? and(...filters) : undefined;

    const [
      totalResult,
      byCityResult,
      byCategoryResult,
      recentRecords
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(infrastructureRecords).where(condition),
      
      db.select({
        city: infrastructureRecords.city,
        total: sql<number>`count(*)::int`,
      })
      .from(infrastructureRecords)
      .where(condition)
      .groupBy(infrastructureRecords.city)
      .orderBy(desc(sql`count(*)`)),

      db.select({
        category: infrastructureRecords.category,
        total: sql<number>`count(*)::int`,
      })
      .from(infrastructureRecords)
      .where(condition)
      .groupBy(infrastructureRecords.category)
      .orderBy(desc(sql`count(*)`)),

      db.select()
        .from(infrastructureRecords)
        .where(condition)
        .orderBy(desc(infrastructureRecords.referenceDate))
        .limit(100)
    ]);

    return NextResponse.json({
      total: totalResult[0]?.count ?? 0,
      byCity: byCityResult,
      byCategory: byCategoryResult,
      cities: availableCities,
      technicians: availableTechnicians,
      data: recentRecords,
    });
  } catch (error) {
    console.error('[infrastructure]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
