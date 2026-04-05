import { CsvDropzone } from '@/components/upload/csv-dropzone';
import { PageLayout } from '@/components/layout/page-layout';
import { db } from '@/lib/db';
import { moduleImportProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ensureDefaultModules } from '@/lib/services/module-service';

export default async function UploadPage() {
  await ensureDefaultModules();

  const activeProfiles = await db.query.moduleImportProfiles.findMany({
    where: eq(moduleImportProfiles.isActive, true),
    orderBy: (p, { asc }) => [asc(p.createdAt)],
  });

  return (
    <PageLayout
      title="DATA INGESTION"
      description="Interface tecnica de upload do Dashmetric. O envio de dados retroalimenta os indicadores analiticos da plataforma."
    >
      <div className="max-w-4xl space-y-6">
        <CsvDropzone profiles={activeProfiles} />
      </div>
    </PageLayout>
  );
}
