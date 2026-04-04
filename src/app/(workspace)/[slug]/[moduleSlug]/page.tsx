import DynamicModulePage from '@/app/(dashboard)/[slug]/page';

export default async function WorkspaceModulePage({
  params,
}: {
  params: Promise<{ slug: string; moduleSlug: string }>;
}) {
  const { moduleSlug } = await params;
  return DynamicModulePage({ params: Promise.resolve({ slug: moduleSlug }) });
}
