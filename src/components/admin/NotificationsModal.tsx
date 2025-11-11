import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { formatDate } from '@/lib/dateUtils';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  related_order_id: number | null;
  is_read: boolean;
  created_at: string;
}

const NOTIFICATION_ICONS: { [key: string]: string } = {
  new_order: '🛒',
  order_update: '📝',
  payment: '💳',
  system: '⚙️',
  calendly_phone: '📞',
  calendly_video: '🎥'
};

export default function NotificationsModal({
  isOpen,
  onClose,
  onUnreadCountChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}) {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    loadNotifications();
  }, [isOpen]);

  const loadNotifications = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/notifications', {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Vous devez être connecté en tant qu'administrateur. Ouvrez /admin/login dans un nouvel onglet.");
        }
        throw new Error('Erreur lors du chargement des notifications');
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
      onUnreadCountChange?.(data.unread_count || 0);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          notification_id: notificationId,
          mark_as_read: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      await loadNotifications();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mark_all_as_read: true }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      await loadNotifications();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (notification.related_order_id) {
      router.push('/admin/orders');
      onClose();
    }
  };

  const formatRelativeTime = (dateString: string) => {
    // SQLite CURRENT_TIMESTAMP retourne une date UTC au format 'YYYY-MM-DD HH:MM:SS'
    // On ajoute 'Z' pour indiquer explicitement qu'elle est en UTC
    const utcDateString = dateString.includes('Z') ? dateString : dateString.replace(' ', 'T') + 'Z';
    const date = new Date(utcDateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="absolute inset-x-0 top-10 mx-auto w-full max-w-3xl rounded-xl bg-white shadow-2xl border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔔</span>
            <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                ✓ Tout marquer comme lu
              </button>
            )}
            <button onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-600">×</button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-auto p-4">
          {isLoading && (
            <div className="py-12 text-center text-gray-600">Chargement...</div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              <p className="mb-2">{error}</p>
              <Link href="/admin/login" className="text-blue-600 underline">Aller à la page de connexion admin</Link>
            </div>
          )}

          {!isLoading && !error && notifications.length === 0 && (
            <div className="py-12 text-center text-gray-600">Aucune notification</div>
          )}

          <div className="space-y-2">
            {notifications.map((notification) => {
              const icon = NOTIFICATION_ICONS[notification.type] || '📬';
              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`bg-white rounded-lg shadow-sm border-2 p-5 cursor-pointer transition ${
                    notification.is_read
                      ? 'border-gray-200 hover:border-gray-300'
                      : 'border-blue-300 bg-blue-50 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                      notification.is_read ? 'bg-gray-100' : 'bg-blue-100'
                    }`}>
                      {icon}
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className={`text-lg font-semibold ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                          {notification.title}
                        </h3>
                        {!notification.is_read && <span className="flex-shrink-0 w-3 h-3 bg-blue-600 rounded-full" />}
                      </div>
                      <p className={`text-sm mb-2 ${notification.is_read ? 'text-gray-500' : 'text-gray-700'}`}>{notification.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{formatRelativeTime(notification.created_at)}</span>
                        {notification.related_order_id && <span className="text-blue-600">→ Voir la commande</span>}
                      </div>
                    </div>
                    {!notification.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="flex-shrink-0 p-2 text-gray-400 hover:text-blue-600 transition"
                        title="Marquer comme lu"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
