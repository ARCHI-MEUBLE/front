import { useState, useEffect } from 'react';

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
  status: string;
  confirmation_sent: boolean;
  reminder_24h_sent: boolean;
  reminder_1h_sent: boolean;
  created_at: string;
  formatted_start?: string;
  formatted_end?: string;
  formatted_date?: string;
  formatted_time?: string;
}

interface AppointmentsResponse {
  success: boolean;
  appointments: CalendlyAppointment[];
  total: number;
  limit: number;
  offset: number;
}

export function DashboardAppointments() {
  const [appointments, setAppointments] = useState<CalendlyAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadAppointments();
  }, [statusFilter]);

  const loadAppointments = async () => {
    setIsLoading(true);
    setError('');

    try {
      let url = 'http://localhost:8000/backend/api/calendly/appointments.php';
      if (statusFilter !== 'all') {
        url += `?status=${statusFilter}`;
      }

      const response = await fetch(url, {
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
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { label: string; className: string } } = {
      scheduled: { label: 'Prévu', className: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Terminé', className: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Annulé', className: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}>
        {config.label}
      </span>
    );
  };

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

  const isUpcoming = (startTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    return start > now;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-gray-600">Chargement des rendez-vous...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 border border-red-200">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rendez-vous Calendly</h2>
          <p className="mt-1 text-sm text-gray-500">
            {total} rendez-vous au total
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Tous les statuts</option>
            <option value="scheduled">Prévus</option>
            <option value="completed">Terminés</option>
            <option value="cancelled">Annulés</option>
          </select>

          <button
            onClick={loadAppointments}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            🔄 Actualiser
          </button>
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun rendez-vous</h3>
          <p className="text-gray-500">
            {statusFilter === 'all'
              ? 'Aucun rendez-vous Calendly pour le moment'
              : `Aucun rendez-vous avec le statut "${statusFilter}"`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
          {appointments.map((appointment) => {
            const upcoming = isUpcoming(appointment.start_time);
            const icon = getEventTypeIcon(appointment.event_type);

            return (
              <div
                key={appointment.id}
                className={`rounded-lg border-2 p-6 transition-all hover:shadow-lg ${
                  upcoming
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-3xl ${
                      upcoming ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      {icon}
                    </div>

                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {appointment.client_name}
                        </h3>
                        {getStatusBadge(appointment.status)}
                        {upcoming && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                            ⏰ À venir
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">📧 Email:</span>
                          <a
                            href={`mailto:${appointment.client_email}`}
                            className="text-blue-600 hover:underline"
                          >
                            {appointment.client_email}
                          </a>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">🏷️ Type:</span>
                          <span>{appointment.event_type}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">📅 Date:</span>
                          <span className="font-semibold text-gray-900">
                            {appointment.formatted_start || appointment.start_time}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">⏱️ Durée:</span>
                          <span>
                            {appointment.formatted_time ||
                              `${appointment.formatted_start} - ${appointment.formatted_end}`}
                          </span>
                        </div>

                        {appointment.config_url && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="font-medium">🔗 Configuration:</span>
                            <a
                              href={appointment.config_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Voir la config
                            </a>
                          </div>
                        )}

                        {appointment.additional_notes && (
                          <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm">
                            <span className="font-medium text-gray-700">📝 Notes:</span>
                            <p className="mt-1 text-gray-600">{appointment.additional_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="text-xs text-gray-500">
                      Réservé le {new Date(appointment.created_at).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                      {appointment.confirmation_sent && (
                        <span className="flex items-center gap-1 text-green-600">
                          ✓ Confirmation envoyée
                        </span>
                      )}
                      {appointment.reminder_24h_sent && (
                        <span className="flex items-center gap-1 text-green-600">
                          ✓ Rappel 24h envoyé
                        </span>
                      )}
                      {appointment.reminder_1h_sent && (
                        <span className="flex items-center gap-1 text-green-600">
                          ✓ Rappel 1h envoyé
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
