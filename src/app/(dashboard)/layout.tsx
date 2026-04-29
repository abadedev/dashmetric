import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { getUserWorkspaces, resolveActiveWorkspace } from '@/lib/workspace';
import { Sidebar } from '@/components/layout/sidebar';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { SidebarAwareContent } from '@/components/layout/sidebar-aware-content';
import { DashielWidget } from '@/components/ai/dashiel-widget';
import { UnreadNotificationsDialog } from '@/components/notifications/unread-notifications-dialog';

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
  const preferredSlug = cookieStore.get('dwm_active_workspace')?.value ?? null;
  const activeWorkspace = await resolveActiveWorkspace(session.user.id, preferredSlug);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <SidebarAwareContent widget={<DashielWidget workspaceSlug={activeWorkspace?.slug} />}>
          <UnreadNotificationsDialog />
          {children}
        </SidebarAwareContent>
      </div>
    </SidebarProvider>
  );
}
