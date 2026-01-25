"use client"

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views, SlotInfo } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import toast from 'react-hot-toast';
import {
  IconCalendar,
  IconX,
  IconRefresh,
  IconPhone,
  IconVideo,
} from '@tabler/icons-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const locales = {
  'fr': fr,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: fr }),
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

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
  confirmation_sent: boolean;
  reminder_24h_sent: boolean;
  reminder_1h_sent: boolean;
  created_at: string;
}

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: CalendlyAppointment;
  status: string;
  eventType: string;
}

interface AppointmentsResponse {
  success: boolean;
  appointments: CalendlyAppointment[];
  total: number;
}

const getEventTypeIcon = (eventType: string) => {
  const type = eventType.toLowerCase();
  if (type.includes('téléphone') || type.includes('phone') || type.includes('appel')) {
    return '📞';
  }
  if (type.includes('visio') || type.includes('video')) {
    return '🎥';
  }
  return '📅';
};

export function DashboardCalendar() {
  const [appointments, setAppointments] = useState<CalendlyAppointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<CalendlyAppointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/appointments', {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Vous devez être connecté en tant qu'administrateur");
        }
        throw new Error('Erreur lors du chargement des rendez-vous');
      }

      const data: AppointmentsResponse = await response.json();
      const appts = data.appointments || [];
      setAppointments(appts);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const events: CalendarEvent[] = useMemo(() => {
    return appointments.map(apt => ({
      id: apt.id,
      title: `${getEventTypeIcon(apt.event_type)} ${apt.client_name}`,
      start: new Date(apt.start_time),
      end: new Date(apt.end_time),
      resource: apt,
      status: apt.status,
      eventType: apt.event_type,
    }));
  }, [appointments]);

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    let backgroundColor = 'hsl(var(--primary))';
    const type = event.eventType.toLowerCase();

    if (event.status === 'cancelled') {
      backgroundColor = 'hsl(var(--muted))';
    } else if (type.includes('visio') || type.includes('video')) {
      backgroundColor = '#2196f3';
    } else if (type.includes('téléphone') || type.includes('phone')) {
      backgroundColor = '#4caf50';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: event.status === 'cancelled' ? 0.6 : 1,
        color: 'white',
        border: 'none',
        display: 'block',
        fontSize: '12px',
        padding: '2px 5px',
      },
    };
  }, []);

  const handleEventDrop = async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    if (!confirm(`Reprogrammer le rendez-vous de ${event.resource.client_name} ?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/backend/api/calendly/appointment-actions.php?id=${event.id}&action=reschedule`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            start_time: start.toISOString(),
            end_time: end.toISOString(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la reprogrammation');
      }

      await loadAppointments();
      toast.success('Rendez-vous reprogrammé avec succès !');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la reprogrammation');
      await loadAppointments();
    }
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedAppointment(event.resource);
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    console.log('Slot sélectionné:', slotInfo);
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
      {/* Calendar Section */}
      <div className="px-4 lg:px-6 space-y-4">
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Légende</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#2196f3' }}></div>
                <span className="flex items-center gap-1">
                  <IconVideo className="w-4 h-4" /> Visioconférence
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#4caf50' }}></div>
                <span className="flex items-center gap-1">
                  <IconPhone className="w-4 h-4" /> Téléphone
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted"></div>
                <span className="flex items-center gap-1">
                  <IconX className="w-4 h-4" /> Annulé
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Calendrier</CardTitle>
            <CardDescription>Glissez-déposez pour reprogrammer un rendez-vous</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div style={{ height: '700px' }} className="calendar-wrapper">
              <DnDCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                selectable
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                eventPropGetter={eventStyleGetter}
                onEventDrop={handleEventDrop}
                resizable={false}
                messages={{
                  next: 'Suivant',
                  previous: 'Précédent',
                  today: "Aujourd'hui",
                  month: 'Mois',
                  week: 'Semaine',
                  day: 'Jour',
                  agenda: 'Agenda',
                  date: 'Date',
                  time: 'Heure',
                  event: 'Événement',
                  noEventsInRange: 'Aucun rendez-vous dans cette période',
                  showMore: (total) => `+ ${total} de plus`,
                }}
                formats={{
                  dayHeaderFormat: (date) => format(date, 'EEEE d MMMM', { locale: fr }),
                  dayRangeHeaderFormat: ({ start, end }) =>
                    `${format(start, 'd MMM', { locale: fr })} - ${format(end, 'd MMM yyyy', { locale: fr })}`,
                  monthHeaderFormat: (date) => format(date, 'MMMM yyyy', { locale: fr }),
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Sheet */}
      <Sheet open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
          {selectedAppointment && (
            <div className="flex flex-col h-full">
              <SheetHeader className="px-4 sm:px-6 py-4 sm:py-6 border-b">
                <SheetTitle className="text-lg sm:text-xl">
                  {getEventTypeIcon(selectedAppointment.event_type)} Rendez-vous #{selectedAppointment.id}
                </SheetTitle>
                <SheetDescription className="text-sm">{selectedAppointment.event_type}</SheetDescription>
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
                    <p>
                      <span className="font-medium">Début:</span>{' '}
                      {new Date(selectedAppointment.start_time).toLocaleString('fr-FR')}
                    </p>
                    <p>
                      <span className="font-medium">Fin:</span>{' '}
                      {new Date(selectedAppointment.end_time).toLocaleString('fr-FR')}
                    </p>
                    <p>
                      <span className="font-medium">Statut:</span>{' '}
                      <Badge variant={
                        selectedAppointment.status === 'completed' ? 'secondary' :
                        selectedAppointment.status === 'cancelled' ? 'destructive' : 'default'
                      }>
                        {selectedAppointment.status === 'scheduled' ? 'Prévu' :
                         selectedAppointment.status === 'completed' ? 'Terminé' :
                         selectedAppointment.status === 'cancelled' ? 'Annulé' : selectedAppointment.status}
                      </Badge>
                    </p>
                    {selectedAppointment.additional_notes && (
                      <div>
                        <span className="font-medium">Notes:</span>
                        <p className="mt-1 text-muted-foreground">{selectedAppointment.additional_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedAppointment.meeting_url && (
                  <Card className="border-primary">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm sm:text-base">Lien de réunion</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button asChild className="w-full">
                        <a
                          href={selectedAppointment.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <IconVideo className="w-4 h-4 mr-2" />
                          Rejoindre la visioconférence
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="p-4 sm:p-6 border-t">
                <Button
                  onClick={() => setSelectedAppointment(null)}
                  variant="outline"
                  className="w-full"
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
