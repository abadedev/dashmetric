import { redirect } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { getUserWorkspaces, resolveActiveWorkspace } from '@/lib/workspace';

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/auth');

  const cookieStore = await cookies();
  const preferredSlug = cookieStore.get('dwm_active_workspace')?.value ?? null;
  const activeWorkspace = await resolveActiveWorkspace(session.user.id, preferredSlug);

  if (!activeWorkspace) redirect('/waiting');

  redirect(`/${activeWorkspace.slug}/dashboard`);
}
