import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { Menu } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Sidebar, { type DashboardSection } from '@/components/admin/Sidebar';
import { DashboardModels } from '@/components/admin/DashboardModels';
import { DashboardCatalogue } from '@/components/admin/DashboardCatalogue';
import { DashboardConfigs } from '@/components/admin/DashboardConfigs';
import { DashboardOrders } from '@/components/admin/DashboardOrders';
import DashboardPayments from '@/components/admin/DashboardPayments';
import { DashboardAppointments } from '@/components/admin/DashboardAppointments';
import { DashboardCalendar } from '@/components/admin/DashboardCalendar';
import { DashboardAvis } from '@/components/admin/DashboardAvis';
import { DashboardSamples } from '@/components/admin/DashboardSamples';
import { DashboardSamplesAnalytics } from '@/components/admin/DashboardSamplesAnalytics';
import { DashboardPassword } from '@/components/admin/DashboardPassword';
import { hasAdminSession } from '@/lib/adminAuth';
import NotificationsModal from '@/components/admin/NotificationsModal';

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
  const [selectedSection, setSelectedSection] = useState<DashboardSection>('orders');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const lastNotificationIdRef = useRef<number>(0);

  useEffect(() => {
    // Charger le nombre de notifications non lues (si session admin PHP valide)
    const loadUnread = async () => {
      try {
        const res = await fetch('/api/admin/notifications?unread=true', {
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json();
        setUnreadCount(data.unread_count || 0);
      } catch {
        // ignorer
      }
    };
    loadUnread();

    // Polling pour les nouvelles notifications (toutes les 30 secondes)
    const pollNotifications = async () => {
      try {
        const res = await fetch('/api/admin/notifications?limit=5', {
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data.notifications && data.notifications.length > 0) {
          const latestNotif = data.notifications[0];

          // Si on a une nouvelle notification (ID plus grand que le dernier connu)
          if (latestNotif.id > lastNotificationIdRef.current) {
            lastNotificationIdRef.current = latestNotif.id;

            // Afficher un toast uniquement si ce n'est pas la première fois
            if (lastNotificationIdRef.current > latestNotif.id - 1) {
              const icon = latestNotif.type === 'visio' ? '🎥' : '📞';
              toast.success(
                `${icon} Nouveau rendez-vous\n${latestNotif.message}`,
                {
                  duration: 5000,
                  position: 'bottom-right',
                  style: {
                    background: '#f6f1eb',
                    color: '#2f2a26',
                    border: '1px solid #2f2a26',
                  },
                }
              );
            }

            // Recharger le compteur
            loadUnread();
          }
        }
      } catch {
        // ignorer
      }
    };

    // Initialiser avec la dernière notification
    const initLastNotification = async () => {
      try {
        const res = await fetch('/api/admin/notifications?limit=1', {
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.notifications && data.notifications.length > 0) {
          lastNotificationIdRef.current = data.notifications[0].id;
        }
      } catch {
        // ignorer
      }
    };

    initLastNotification();

    // Démarrer le polling
    const intervalId = setInterval(pollNotifications, 30000); // 30 secondes

    return () => clearInterval(intervalId);
  }, []);

  const handleSelect = (section: DashboardSection) => {
    setSelectedSection(section);
    setIsSidebarOpen(false);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Déconnexion impossible');
      await router.push('/admin/login');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* --- Sidebar fixe --- */}
      <Sidebar
        selectedSection={selectedSection}
        onSelect={handleSelect}
        onLogout={handleLogout}
        className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:bg-white sticky top-0 h-screen overflow-y-auto"
      />

      {/* --- Contenu principal --- */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Head>
          <title>ArchiMeuble — Tableau de bord</title>
        </Head>

        {/* --- Barre supérieure mobile --- */}
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
                className="relative z-10 w-72 border-r-0 shadow-xl bg-white"
                showCloseButton
                onClose={() => setIsSidebarOpen(false)}
              />
            </div>
          )}
        </div>

        {/* --- Zone de contenu scrollable --- */}
        <main className="flex-1 overflow-y-auto">
          {/* Header fixe */}
          <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-amber-600">Espace administrateur</p>
              <h1 className="text-2xl font-semibold text-gray-900">Tableau de bord</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-100"
              >
                <span>🏠</span>
                <span>Accueil</span>
              </button>
              <button
                type="button"
                onClick={() => setIsNotifOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <span>🔔</span>
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}
              </button>
            </div>
          </header>

          {/* Contenu dynamique - Remplir toute la largeur */}
          <div className="w-full p-6 space-y-6">
            {selectedSection === 'models' && <DashboardModels />}
            {selectedSection === 'catalogue' && <DashboardCatalogue />}
            {selectedSection === 'configs' && <DashboardConfigs />}
            {selectedSection === 'orders' && <DashboardOrders />}
            {selectedSection === 'payments' && <DashboardPayments />}
            {selectedSection === 'appointments' && <DashboardAppointments />}
            {selectedSection === 'calendar' && <DashboardCalendar />}
            {selectedSection === 'avis' && <DashboardAvis />}
            {selectedSection === 'samples' && <DashboardSamples />}
            {selectedSection === 'samples-analytics' && <DashboardSamplesAnalytics />}
            {selectedSection === 'password' && <DashboardPassword />}
          </div>
        </main>
      </div>
      <NotificationsModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onUnreadCountChange={(c) => setUnreadCount(c)}
      />
      <Toaster />
    </div>
  );
}
