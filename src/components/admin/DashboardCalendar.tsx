import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views, SlotInfo } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

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

// Wrap Calendar with Drag and Drop
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
      setAppointments(data.appointments || []);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  // Convertir les rendez-vous en événements du calendrier
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

  // Style personnalisé pour les événements selon le type et le statut
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    let backgroundColor = '#2f2a26';
    const type = event.eventType.toLowerCase();

    if (event.status === 'cancelled') {
      backgroundColor = '#9e9e9e';
    } else if (type.includes('visio') || type.includes('video')) {
      backgroundColor = '#2196f3'; // Bleu pour visio
    } else if (type.includes('téléphone') || type.includes('phone')) {
      backgroundColor = '#4caf50'; // Vert pour téléphone
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

  // Drag & Drop pour reprogrammer
  const handleEventDrop = async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    if (!confirm(`Reprogrammer le rendez-vous de ${event.resource.client_name} ?`)) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/backend/api/calendly/appointment-actions.php?id=${event.id}&action=reschedule`,
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

      // Recharger les rendez-vous
      await loadAppointments();
      alert('Rendez-vous reprogrammé avec succès !');
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la reprogrammation');
      // Recharger pour annuler le changement visuel
      await loadAppointments();
    }
  };

  // Sélection d'un événement
  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedAppointment(event.resource);
  };

  // Sélection d'un slot vide (création future)
  const handleSelectSlot = (slotInfo: SlotInfo) => {
    console.log('Slot sélectionné:', slotInfo);
    // Future: permettre de créer un RDV manuel
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">Calendrier des Rendez-vous</h2>
        <p className="text-sm text-gray-600 mt-1">
          Vue calendrier avec drag & drop pour reprogrammer
        </p>
      </div>

      {error && (
        <div className="p-3 border border-red-300 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Légende */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4" style={{ backgroundColor: '#2196f3' }}></div>
          <span>🎥 Visioconférence</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4" style={{ backgroundColor: '#4caf50' }}></div>
          <span>📞 Téléphone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4" style={{ backgroundColor: '#9e9e9e' }}></div>
          <span>❌ Annulé</span>
        </div>
      </div>

      {/* Calendrier */}
      <div className="border border-gray-200 bg-white p-4" style={{ height: '700px' }}>
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

      {/* Modal détails (simplifié) */}
      {selectedAppointment && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedAppointment(null)}
        >
          <div
            className="bg-white border border-gray-300 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {getEventTypeIcon(selectedAppointment.event_type)} {selectedAppointment.event_type}
                </h2>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3 text-sm">
              <div>
                <span className="font-medium">Client:</span> {selectedAppointment.client_name}
              </div>
              <div>
                <span className="font-medium">Email:</span> {selectedAppointment.client_email}
              </div>
              {selectedAppointment.phone_number && (
                <div>
                  <span className="font-medium">Téléphone:</span> {selectedAppointment.phone_number}
                </div>
              )}
              <div>
                <span className="font-medium">Début:</span> {new Date(selectedAppointment.start_time).toLocaleString('fr-FR')}
              </div>
              <div>
                <span className="font-medium">Fin:</span> {new Date(selectedAppointment.end_time).toLocaleString('fr-FR')}
              </div>
              <div>
                <span className="font-medium">Statut:</span> {selectedAppointment.status}
              </div>
              {selectedAppointment.meeting_url && (
                <div className="pt-2">
                  <a
                    href={selectedAppointment.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 text-xs font-medium bg-green-600 text-white hover:bg-green-700"
                  >
                    🎥 Rejoindre la visioconférence →
                  </a>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedAppointment(null)}
                className="px-4 py-2 text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:border-gray-900"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
