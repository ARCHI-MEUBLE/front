"use client"

import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/dateUtils';
import toast from 'react-hot-toast';
import {
  IconCalendar,
  IconCircleCheck,
  IconX,
  IconRefresh,
  IconPhone,
  IconVideo,
  IconClock,
  IconTrendingUp,
  IconEye,
  IconFilter,
} from '@tabler/icons-react';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CalendlyAppointment {
  id: number;
  calendly_event_id: string;
  client_name: string;
  client_email: string;
  event_type: string;
  start_time: string;
  end_time: string;
  timezone: string;
  config_url: string | null;
  additional_notes: string | null;
  meeting_url: string | null;
  phone_number: string | null;
  status: string;
  created_at: string;
}

interface AppointmentsResponse {
  success: boolean;
  appointments: CalendlyAppointment[];
  total: number;
}

interface Stats {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
}

const STATUS_CONFIG: {
  [key: string]: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  };
} = {
  scheduled: { label: 'Prévu', icon: IconCalendar, variant: 'default' },
  completed: { label: 'Terminé', icon: IconCircleCheck, variant: 'secondary' },
  cancelled: { label: 'Annulé', icon: IconX, variant: 'destructive' },
};

export function DashboardAppointments() {
  const [appointments, setAppointments] = useState<CalendlyAppointment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<CalendlyAppointment | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAppointments();
  }, [filterStatus]);

  const loadAppointments = async () => {
    setIsLoading(true);
    setError('');

    try {
      let url = '/api/admin/appointments';
      if (filterStatus !== 'all') {
        url += `?status=${filterStatus}`;
      }

      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des rendez-vous');
      }

      const data: AppointmentsResponse = await response.json();
      const appts = data.appointments || [];
      setAppointments(appts);

      const statsData: Stats = {
        total: data.total || 0,
        scheduled: appts.filter(a => a.status === 'scheduled').length,
        completed: appts.filter(a => a.status === 'completed').length,
        cancelled: appts.filter(a => a.status === 'cancelled').length,
      };
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    const type = eventType.toLowerCase();
    if (type.includes('téléphone') || type.includes('phone') || type.includes('appel')) {
      return IconPhone;
    }
    if (type.includes('visio') || type.includes('video')) {
      return IconVideo;
    }
    return IconCalendar;
  };

  const isUpcoming = (startTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    return start > now;
  };

  const handleAction = async (appointmentId: number, action: 'cancel' | 'complete') => {
    if (!confirm(`Êtes-vous sûr de vouloir ${action === 'cancel' ? 'annuler' : 'marquer comme terminé'} ce rendez-vous ?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/backend/api/calendly/appointment-actions.php?id=${appointmentId}&action=${action}`,
        {
          method: 'PUT',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de l\'action');
      }

      toast.success('Action réussie');
      await loadAppointments();
      setSelectedAppointment(null);
    } catch (error) {
      console.error('Erreur lors de l\'action:', error);
      toast.error('Erreur lors de l\'action');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <IconRefresh className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Stats Cards */}
      {stats && (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-2 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-4 lg:px-6">
          <Card className="@container/card">
            <CardHeader className="pb-2">
              <CardDescription>TOTAL</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {stats.total}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <IconCalendar className="size-3" />
                  Tous
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Rendez-vous total <IconCalendar className="size-4" />
              </div>
              <div className="text-muted-foreground">
                Depuis le début
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card">
            <CardHeader className="pb-2">
              <CardDescription>PRÉVUS</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {stats.scheduled}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <IconClock className="size-3" />
                  À venir
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Rendez-vous à venir <IconClock className="size-4" />
              </div>
              <div className="text-muted-foreground">
                Planifiés et confirmés
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card">
            <CardHeader className="pb-2">
              <CardDescription>TERMINÉS</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {stats.completed}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <IconCircleCheck className="size-3" />
                  Complétés
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Rendez-vous faits <IconCircleCheck className="size-4" />
              </div>
              <div className="text-muted-foreground">
                Terminés avec succès
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card">
            <CardHeader className="pb-2">
              <CardDescription>ANNULÉS</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {stats.cancelled}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <IconX className="size-3" />
                  Annulés
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Non honorés <IconX className="size-4" />
              </div>
              <div className="text-muted-foreground">
                Annulés par client ou admin
              </div>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Filters & List */}
      <div className="px-4 lg:px-6 space-y-4">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtrer par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={filterStatus} onValueChange={setFilterStatus}>
              <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full">
                <TabsTrigger value="all">Tous</TabsTrigger>
                {Object.entries(STATUS_CONFIG).map(([status, { label, icon: Icon }]) => (
                  <TabsTrigger key={status} value={status} className="flex items-center gap-1">
                    <Icon className="w-3 h-3" />
                    <span className="hidden sm:inline">{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Appointments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Rendez-vous</CardTitle>
            <CardDescription>Liste des demandes de rendez-vous</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {appointments.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-4xl mb-3">📅</div>
                <h3 className="text-lg font-medium mb-1">Aucun rendez-vous</h3>
                <p className="text-sm text-muted-foreground">
                  {filterStatus === 'all'
                    ? 'Aucun rendez-vous pour le moment'
                    : `Aucun rendez-vous ${STATUS_CONFIG[filterStatus]?.label.toLowerCase()}`}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden md:table-cell">Date/Heure</TableHead>
                    <TableHead className="hidden sm:table-cell">Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appointment) => {
                    const EventIcon = getEventTypeIcon(appointment.event_type);
                    const statusConfig = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.scheduled;
                    const StatusIcon = statusConfig.icon;

                    return (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <EventIcon className="w-5 h-5 text-muted-foreground" />
                            <span className="hidden sm:inline text-sm">{appointment.event_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{appointment.client_name}</div>
                            <div className="text-muted-foreground hidden md:inline">{appointment.client_email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          <div className="font-medium">{formatDate(appointment.start_time)}</div>
                          <div className="text-muted-foreground">
                            {new Date(appointment.start_time).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={statusConfig.variant} className="gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            onClick={() => setSelectedAppointment(appointment)}
                            variant="ghost"
                            size="sm"
                          >
                            <IconEye className="w-4 h-4 mr-1" />
                            Détails
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Sheet */}
      <Sheet open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
          {selectedAppointment && (
            <div className="flex flex-col h-full">
              <SheetHeader className="px-4 sm:px-6 py-4 sm:py-6 border-b">
                <SheetTitle className="text-lg sm:text-xl">Rendez-vous #{selectedAppointment.id}</SheetTitle>
                <SheetDescription className="text-sm">Détails et gestion</SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm sm:text-base">Informations client</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><span className="font-medium">Nom:</span> {selectedAppointment.client_name}</p>
                    <p><span className="font-medium">Email:</span> {selectedAppointment.client_email}</p>
                    {selectedAppointment.phone_number && (
                      <p><span className="font-medium">Téléphone:</span> {selectedAppointment.phone_number}</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm sm:text-base">Détails du rendez-vous</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><span className="font-medium">Type:</span> {selectedAppointment.event_type}</p>
                    <p><span className="font-medium">Date:</span> {formatDate(selectedAppointment.start_time)}</p>
                    <p>
                      <span className="font-medium">Horaire:</span>{' '}
                      {new Date(selectedAppointment.start_time).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}{' '}
                      -{' '}
                      {new Date(selectedAppointment.end_time).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {selectedAppointment.meeting_url && (
                      <p>
                        <span className="font-medium">Lien:</span>{' '}
                        <a href={selectedAppointment.meeting_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Rejoindre
                        </a>
                      </p>
                    )}
                    {selectedAppointment.additional_notes && (
                      <div>
                        <span className="font-medium">Notes:</span>
                        <p className="mt-1 text-muted-foreground">{selectedAppointment.additional_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedAppointment.status === 'scheduled' && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm sm:text-base">Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-2">
                      <Button
                        onClick={() => handleAction(selectedAppointment.id, 'complete')}
                        variant="default"
                        className="flex-1"
                      >
                        <IconCircleCheck className="w-4 h-4 mr-2" />
                        Marquer comme terminé
                      </Button>
                      <Button
                        onClick={() => handleAction(selectedAppointment.id, 'cancel')}
                        variant="destructive"
                        className="flex-1"
                      >
                        <IconX className="w-4 h-4 mr-2" />
                        Annuler
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
