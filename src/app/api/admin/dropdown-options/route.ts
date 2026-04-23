import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/require-auth';
import { hasGlobalRole, type AuthorizationContext } from '@/lib/authorization';
import { db } from '@/lib/db';
import { dropdownOptions } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';

export const runtime = 'nodejs';

const ALLOWED_MODULE_SLUGS = ['infraestrutura', 'listagem-servicos'];

function canManageDropdowns(context: AuthorizationContext) {
  if (hasGlobalRole(context, 'admin')) return true;
  if (context.workspaceRole === 'ADMIN') return true;
  return ALLOWED_MODULE_SLUGS.some((slug) => context.moduleAccess[slug] === 'admin');
}

export async function GET(req: NextRequest) {
  const result = await requireWorkspaceAccess(req);
  if (result.response) return result.response;
  if (!canManageDropdowns(result.context)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');

  const rows = await db
    .select()
    .from(dropdownOptions)
    .where(category ? eq(dropdownOptions.category, category) : undefined)
    .orderBy(asc(dropdownOptions.category), asc(dropdownOptions.sortOrder), asc(dropdownOptions.label));

  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const result = await requireWorkspaceAccess(req);
  if (result.response) return result.response;
  if (!canManageDropdowns(result.context)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { category, value, label, sortOrder } = body;
  if (!category || !value || !label) {
    return NextResponse.json({ error: 'category, value e label são obrigatórios' }, { status: 400 });
  }

  const [created] = await db
    .insert(dropdownOptions)
    .values({ category, value: value.trim(), label: label.trim(), sortOrder: sortOrder ?? 0 })
    .returning();

  return NextResponse.json({ data: created }, { status: 201 });
}
