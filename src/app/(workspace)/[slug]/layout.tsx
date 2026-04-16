import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getUserWorkspaces } from '@/lib/workspace';
import { Sidebar } from '@/components/layout/sidebar';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { SidebarAwareContent } from '@/components/layout/sidebar-aware-content';
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
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <SidebarAwareContent widget={<DashielWidget workspaceSlug={workspaceSlug} />}>
          {children}
        </SidebarAwareContent>
      </div>
    </SidebarProvider>
  );
}
