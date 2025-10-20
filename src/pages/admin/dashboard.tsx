import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { Menu } from 'lucide-react';
import Sidebar, { type DashboardSection } from '@/components/admin/Sidebar';
import { DashboardModels } from '@/components/admin/DashboardModels';
import { DashboardCatalogue } from '@/components/admin/DashboardCatalogue';
import { DashboardConfigs } from '@/components/admin/DashboardConfigs';
import { DashboardPassword } from '@/components/admin/DashboardPassword';
import { hasAdminSession } from '@/lib/adminAuth';

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  if (!hasAdminSession(req.headers.cookie)) {
    return {
      redirect: {
        destination: '/admin/login',
        permanent: false,
      },
    };
  }

  return { props: {} };
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState<DashboardSection>('models');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSelect = (section: DashboardSection) => {
    setSelectedSection(section);
    setIsSidebarOpen(false);
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Déconnexion impossible');
      }
      await router.push('/admin/login');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen lg:pl-64">
      <Head>
        <title>ArchiMeuble — Tableau de bord</title>
      </Head>

      <Sidebar
        selectedSection={selectedSection}
        onSelect={handleSelect}
        onLogout={handleLogout}
        className="hidden lg:fixed lg:inset-y-0 lg:flex lg:h-screen lg:w-64 lg:border-r lg:bg-white"
      />

      <div className="lg:hidden">
        <div className="flex items-center justify-between bg-white px-4 py-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-gray-900">ArchiMeuble</p>
            <p className="text-xs text-gray-500">Administration</p>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden="true"
            />
            <Sidebar
              selectedSection={selectedSection}
              onSelect={handleSelect}
              onLogout={handleLogout}
              className="relative z-10 w-72 border-r-0 shadow-xl"
              showCloseButton
              onClose={() => setIsSidebarOpen(false)}
            />
          </div>
        )}
      </div>

      <main className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-10">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-amber-600">Espace administrateur</p>
              <h1 className="text-3xl font-semibold text-gray-900">Tableau de bord</h1>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}
            </button>
          </header>

          {selectedSection === 'models' && <DashboardModels />}
          {selectedSection === 'catalogue' && <DashboardCatalogue />}
          {selectedSection === 'configs' && <DashboardConfigs />}
          {selectedSection === 'password' && <DashboardPassword />}
        </div>
      </main>
    </div>
  );
}