import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { CsvDropzone } from '@/components/upload/csv-dropzone';
import { PageLayout } from '@/components/layout/page-layout';
import { db } from '@/lib/db';
import { moduleImportProfiles, systemModules } from '@/lib/db/schema';
import { asc, eq, inArray } from 'drizzle-orm';
import { ensureDefaultModules } from '@/lib/services/module-service';
import { auth } from '@/lib/auth';
import { resolveActiveWorkspace } from '@/lib/workspace';

export default async function UploadPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/auth');

  const cookieStore = await cookies();
  const preferredWorkspaceSlug = cookieStore.get('dwm_active_workspace')?.value ?? null;
  const activeWorkspace = await resolveActiveWorkspace(session.user.id, preferredWorkspaceSlug);

  if (!activeWorkspace) {
    redirect('/waiting');
  }

  await ensureDefaultModules(activeWorkspace.id);

  const modules = await db
    .select({ id: systemModules.id })
    .from(systemModules)
    .where(eq(systemModules.workspaceId, activeWorkspace.id));

  const filteredProfiles =
    modules.length > 0
      ? await db
          .select()
          .from(moduleImportProfiles)
          .where(inArray(moduleImportProfiles.moduleId, modules.map((m) => m.id)))
          .orderBy(asc(moduleImportProfiles.createdAt))
      : [];

  return (
    <PageLayout
      title="DATA INGESTION"
      description="Interface tecnica de upload do Dashmetric. O envio de dados retroalimenta os indicadores analiticos da plataforma."
    >
      <div className="max-w-4xl space-y-6">
        <CsvDropzone profiles={filteredProfiles} />
      </div>
    </PageLayout>
  );
}
