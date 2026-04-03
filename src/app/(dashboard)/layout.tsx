import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { DashielProvider } from '@/components/ai/dashiel-provider';
import { DashielWidget } from '@/components/ai/dashiel-widget';
import { auth } from '@/lib/auth';
import { DASHIEL_DEFAULT_CONTEXT } from '@/lib/dashiel/mock-context';
import { getUserWorkspaces, resolveActiveWorkspace } from '@/lib/workspace';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import type { WorkspaceWithRole } from '@/lib/workspace';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect('/auth');
  }

  const userWorkspaces = await getUserWorkspaces(session.user.id);

  if (userWorkspaces.length === 0) {
    redirect('/waiting');
  }

  const cookieStore = await cookies();
  const preferredSlug = cookieStore.get('active_workspace_slug')?.value ?? null;
  const activeWorkspace = await resolveActiveWorkspace(session.user.id, preferredSlug);

  return (
    <DashielProvider initialContext={DASHIEL_DEFAULT_CONTEXT}>
      <div className="flex h-screen w-full overflow-hidden bg-muted/20">
        <div className="hidden md:flex">
          <Sidebar
            userWorkspaces={userWorkspaces}
            activeWorkspace={activeWorkspace as WorkspaceWithRole}
            userRole={session.user.role as string}
          />
        </div>
        <div className="relative flex h-screen w-full flex-1 flex-col overflow-hidden md:pl-64">
          <Header />
          <main className="w-full flex-1 overflow-auto p-4 md:p-6">{children}</main>
          <DashielWidget />
        </div>
      </div>
    </DashielProvider>
  );
}
