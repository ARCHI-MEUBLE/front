import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { formatDate } from '@/lib/dateUtils';
import { adminUrl } from '@/lib/adminPath';
import {
  IconBell,
  IconCheck,
  IconX,
  IconShoppingCart,
  IconCreditCard,
  IconSettings,
  IconPhone,
  IconVideo,
  IconRefresh,
} from '@tabler/icons-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  related_order_id: number | null;
  is_read: boolean;
  created_at: string;
}

const NOTIFICATION_CONFIG: { [key: string]: { icon: React.ComponentType<{ className?: string }>; color: string } } = {
  new_order: { icon: IconShoppingCart, color: 'text-blue-600' },
  order_update: { icon: IconShoppingCart, color: 'text-indigo-600' },
  payment: { icon: IconCreditCard, color: 'text-green-600' },
  system: { icon: IconSettings, color: 'text-gray-600' },
  calendly_phone: { icon: IconPhone, color: 'text-purple-600' },
  calendly_video: { icon: IconVideo, color: 'text-pink-600' }
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
    if (isOpen) {
      loadNotifications();
    }
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
          throw new Error("Vous devez être connecté en tant qu'administrateur.");
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
      router.push(adminUrl('/orders'));
      onClose();
    }
  };

  const formatRelativeTime = (dateString: string) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <IconBell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">Notifications</DialogTitle>
                <DialogDescription className="text-sm">
                  {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est à jour'}
                </DialogDescription>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} variant="outline" size="sm" className="shrink-0">
                <IconCheck className="w-4 h-4 mr-2" />
                Tout marquer comme lu
              </Button>
            )}
          </div>
        </DialogHeader>

        <Separator />

        <div className="overflow-y-auto px-6 py-4 space-y-3" style={{ maxHeight: 'calc(85vh - 140px)' }}>
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <IconRefresh className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
              <p className="text-sm text-destructive mb-2 font-medium">{error}</p>
              <Link href={adminUrl('/login')} className="text-sm text-primary hover:underline">
                Aller à la page de connexion
              </Link>
            </div>
          )}

          {!isLoading && !error && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <IconBell className="w-8 h-8 text-muted-foreground/70" />
              </div>
              <p className="text-base font-medium text-foreground mb-1">Aucune notification</p>
              <p className="text-sm text-muted-foreground">Vous êtes à jour !</p>
            </div>
          )}

          {notifications.map((notification) => {
            const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.system;
            const NotifIcon = config.icon;

            return (
              <div
                key={notification.id}
                className={`group rounded-lg border p-4 cursor-pointer transition-all hover:border-primary/50 hover:bg-accent/50 ${
                  !notification.is_read ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    !notification.is_read ? 'bg-primary/10' : 'bg-muted group-hover:bg-primary/10'
                  }`}>
                    <NotifIcon className={`w-5 h-5 ${config.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-semibold text-sm leading-tight">
                        {notification.title}
                      </h3>
                      {!notification.is_read && (
                        <Badge variant="default" className="shrink-0 h-5 text-xs">Nouveau</Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed mb-2.5 line-clamp-2">
                      {notification.message}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">
                        {formatRelativeTime(notification.created_at)}
                      </span>
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                        >
                          <IconCheck className="w-4 h-4 mr-1" />
                          <span className="text-xs">Marquer lu</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
