import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import toast, { Toaster } from 'react-hot-toast';
import { AdminSidebar, type DashboardSection } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { DashboardModels } from '@/components/admin/DashboardModels';
import { DashboardCatalogue } from '@/components/admin/DashboardCatalogue';
import { DashboardConfigs } from '@/components/admin/DashboardConfigs';
import { DashboardOrders } from '@/components/admin/DashboardOrders';
import DashboardPayments from '@/components/admin/DashboardPayments';
import { DashboardAppointments } from '@/components/admin/DashboardAppointments';
import { DashboardCalendar } from '@/components/admin/DashboardCalendar';
import { DashboardAvis } from '@/components/admin/DashboardAvis';
import { DashboardPassword } from '@/components/admin/DashboardPassword';
import { DashboardPricing } from '@/components/admin/DashboardPricing';
import { hasAdminSession } from '@/lib/adminAuth';
import NotificationsModal from '@/components/admin/NotificationsModal';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

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

const sectionTitles: Record<DashboardSection, { title: string; description: string }> = {
  models: { title: 'Modèles de meubles', description: 'Gérer le catalogue de modèles' },
  catalogue: { title: 'Configurateur', description: 'Options et personnalisations' },
  configs: { title: 'Configurations clients', description: 'Configurations enregistrées par les clients' },
  orders: { title: 'Gestion des commandes', description: 'Toutes les commandes et leur statut' },
  payments: { title: 'Paiements', description: 'Historique et gestion des paiements' },
  appointments: { title: 'Demandes de rendez-vous', description: 'Nouvelles demandes de rendez-vous' },
  calendar: { title: 'Calendrier', description: 'Planning des rendez-vous' },
  avis: { title: 'Avis clients', description: 'Gérer les avis et témoignages' },
  pricing: { title: 'Gestion des prix', description: 'Configurez les prix au mètre cube' },
  password: { title: 'Paramètres', description: 'Modifier le mot de passe' },
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState<DashboardSection>('orders');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const lastNotificationIdRef = useRef<number>(0);
  const [adminInfo, setAdminInfo] = useState<{ email: string; name: string } | null>(null);

  useEffect(() => {
    // Charger les infos de l'admin connecté
    const loadAdminInfo = async () => {
      try {
        const res = await fetch('/api/admin/session', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.admin) {
            setAdminInfo({
              email: data.admin.email || 'admin@archimeuble.com',
              name: data.admin.username || 'Admin',
            });
          }
        }
      } catch {
        // Ignorer les erreurs
      }
    };
    loadAdminInfo();

    // Écouter les événements de navigation depuis d'autres composants
    const handleNavigate = (event: CustomEvent) => {
      setSelectedSection(event.detail as DashboardSection);
    };

    window.addEventListener('navigate-dashboard', handleNavigate as EventListener);

    // Charger le nombre de notifications non lues
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

          if (latestNotif.id > lastNotificationIdRef.current) {
            lastNotificationIdRef.current = latestNotif.id;

            if (lastNotificationIdRef.current > latestNotif.id - 1) {
              const icon = latestNotif.type === 'visio' ? '🎥' : '📞';
              toast.success(
                `${icon} Nouveau rendez-vous\n${latestNotif.message}`,
                {
                  duration: 5000,
                  position: 'bottom-right',
                }
              );
            }

            loadUnread();
          }
        }
      } catch {
        // ignorer
      }
    };

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
    const intervalId = setInterval(pollNotifications, 30000);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('navigate-dashboard', handleNavigate as EventListener);
    };
  }, []);

  const handleSelect = (section: DashboardSection) => {
    setSelectedSection(section);
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
      toast.error('Erreur lors de la déconnexion');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const currentSection = sectionTitles[selectedSection];

  return (
    <>
      <Head>
        <title>ArchiMeuble — {currentSection.title}</title>
      </Head>

      <SidebarProvider
        style={
          {
            "--sidebar-width": "18rem",
          } as React.CSSProperties
        }
      >
        <AdminSidebar
          selectedSection={selectedSection}
          onSelect={handleSelect}
          onLogout={handleLogout}
          adminEmail={adminInfo?.email}
          adminName={adminInfo?.name}
          variant="inset"
        />
        <SidebarInset>
          <AdminHeader
            title={currentSection.title}
            description={currentSection.description}
            onNotificationsClick={() => setIsNotifOpen(true)}
            onHomeClick={() => router.push('/')}
            unreadCount={unreadCount}
          />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                {selectedSection === 'models' && <DashboardModels />}
                {selectedSection === 'catalogue' && <DashboardCatalogue />}
                {selectedSection === 'configs' && <DashboardConfigs />}
                {selectedSection === 'orders' && <DashboardOrders />}
                {selectedSection === 'payments' && <DashboardPayments />}
                {selectedSection === 'appointments' && <DashboardAppointments />}
                {selectedSection === 'calendar' && <DashboardCalendar />}
                {selectedSection === 'avis' && <DashboardAvis />}
                {selectedSection === 'pricing' && <DashboardPricing />}
                {selectedSection === 'password' && <DashboardPassword />}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>

      <NotificationsModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onUnreadCountChange={(c) => setUnreadCount(c)}
      />
      <Toaster />
    </>
  );
}
