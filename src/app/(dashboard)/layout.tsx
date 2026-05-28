import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getUserWorkspaces } from '@/lib/workspace';
import { Sidebar } from '@/components/layout/sidebar';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { SidebarAwareContent } from '@/components/layout/sidebar-aware-content';
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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <SidebarAwareContent>
          <UnreadNotificationsDialog />
          {children}
        </SidebarAwareContent>
      </div>
    </SidebarProvider>
  );
}
