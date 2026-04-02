import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { DashielWidget } from '@/components/dashiel/dashiel-widget';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-muted/20 overflow-hidden w-full">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col w-full md:pl-64 h-screen overflow-hidden relative">
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-6 w-full">{children}</main>
        <DashielWidget />
      </div>
    </div>
  );
}
