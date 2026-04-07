import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getUserWorkspaces } from '@/lib/workspace';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { DashielWidget } from '@/components/ai/dashiel-widget';

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/auth');

  const { slug: workspaceSlug } = await params;
  const userWorkspaces = await getUserWorkspaces(session.user.id);
  const activeWorkspace = userWorkspaces.find((w) => w.slug === workspaceSlug);

  if (!activeWorkspace) redirect('/waiting');

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <div className="relative flex min-h-screen w-full flex-1 flex-col bg-[linear-gradient(180deg,color-mix(in_oklab,var(--background)_92%,white_8%),var(--background))] md:pl-64">
        <Header />
        <main className="w-full flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
        <DashielWidget workspaceSlug={workspaceSlug} />
      </div>
    </div>
  );
}
