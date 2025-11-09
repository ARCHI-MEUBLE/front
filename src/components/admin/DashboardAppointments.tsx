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
  meeting_url: string | null;
  phone_number: string | null;
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

interface Stats {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
}

const STATUS_LABELS: { [key: string]: { label: string; icon: string } } = {
  scheduled: { label: 'Prévu', icon: '📅' },
  completed: { label: 'Terminé', icon: '✅' },
  cancelled: { label: 'Annulé', icon: '❌' },
};

export function DashboardAppointments() {
  const [appointments, setAppointments] = useState<CalendlyAppointment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<CalendlyAppointment | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    loadAppointments();
  }, [filterStatus]);

  const loadAppointments = async () => {
    setIsLoading(true);
    setError('');

    try {
      let url = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/backend/api/calendly/appointments.php';
      if (filterStatus !== 'all') {
        url += `?status=${filterStatus}`;
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
      const appts = data.appointments || [];
      setAppointments(appts);

      // Calculer les stats
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAction = async (appointmentId: number, action: 'cancel' | 'complete') => {
    if (!confirm(`Êtes-vous sûr de vouloir ${action === 'cancel' ? 'annuler' : 'marquer comme terminé'} ce rendez-vous ?`)) {
      return;
    }

    setIsActionLoading(true);
    setActionMessage('');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/backend/api/calendly/appointment-actions.php?id=${appointmentId}&action=${action}`,
        {
          method: 'PUT',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de l\'action');
      }

      const data = await response.json();
      setActionMessage(data.message || 'Action réussie');

      // Recharger les rendez-vous
      await loadAppointments();

      // Fermer le modal après 1 seconde
      setTimeout(() => {
        setSelectedAppointment(null);
        setActionMessage('');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'action');
    } finally {
      setIsActionLoading(false);
    }
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
      {/* Stats - Design sobre */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border border-gray-200 p-3">
            <p className="text-xs text-gray-500 uppercase">Total</p>
            <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
          </div>
          <div className="border border-gray-200 p-3">
            <p className="text-xs text-gray-500 uppercase">Prévus</p>
            <p className="text-xl font-semibold text-gray-900">{stats.scheduled}</p>
          </div>
          <div className="border border-gray-200 p-3">
            <p className="text-xs text-gray-500 uppercase">Terminés</p>
            <p className="text-xl font-semibold text-gray-900">{stats.completed}</p>
          </div>
          <div className="border border-gray-200 p-3">
            <p className="text-xs text-gray-500 uppercase">Annulés</p>
            <p className="text-xl font-semibold text-gray-900">{stats.cancelled}</p>
          </div>
        </div>
      )}

      {/* Filters - Design sobre */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 text-xs font-medium border whitespace-nowrap ${
            filterStatus === 'all'
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-900'
          }`}
        >
          Tous
        </button>
        {Object.entries(STATUS_LABELS).map(([status, info]) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 text-xs font-medium border whitespace-nowrap ${
              filterStatus === status
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-900'
            }`}
          >
            {info.icon} {info.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 border border-red-300 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Table - Design sobre sans shadow */}
      {appointments.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 bg-white">
          <div className="text-4xl mb-3">📅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun rendez-vous</h3>
          <p className="text-sm text-gray-600">
            {filterStatus === 'all'
              ? 'Aucun rendez-vous pour le moment'
              : `Aucun rendez-vous avec le statut "${STATUS_LABELS[filterStatus]?.label}"`
            }
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 bg-white">
          <table className="w-full">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Heure</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Réservé le</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {appointments.map((appointment) => {
                const statusInfo = STATUS_LABELS[appointment.status] || STATUS_LABELS.scheduled;
                const upcoming = isUpcoming(appointment.start_time);
                const icon = getEventTypeIcon(appointment.event_type);

                return (
                  <tr key={appointment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{icon}</span>
                        <span className="text-xs font-medium text-gray-900">
                          {appointment.event_type}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <div className="font-medium text-gray-900">{appointment.client_name}</div>
                        <div className="text-gray-500">{appointment.client_email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <div className="font-medium text-gray-900">
                          {appointment.formatted_start || appointment.start_time}
                        </div>
                        {upcoming && (
                          <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                            ⏰ À venir
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-900 text-xs font-medium">
                        <span>{statusInfo.icon}</span>
                        <span>{statusInfo.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(appointment.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedAppointment(appointment)}
                        className="text-xs font-medium text-gray-900 hover:underline"
                      >
                        Voir détails →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal détails - Design sobre */}
      {selectedAppointment && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedAppointment(null)}
        >
          <div
            className="bg-white border border-gray-300 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Rendez-vous {getEventTypeIcon(selectedAppointment.event_type)} {selectedAppointment.event_type}
                </h2>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {actionMessage && (
                <div className="p-3 border border-green-300 bg-green-50 text-green-700 text-sm">
                  {actionMessage}
                </div>
              )}

              {/* Client */}
              <div className="border border-gray-200 p-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Informations Client
                </h3>
                <div className="space-y-1 text-xs">
                  <p><span className="font-medium">Nom:</span> {selectedAppointment.client_name}</p>
                  <p><span className="font-medium">Email:</span> {selectedAppointment.client_email}</p>
                  <p>
                    <span className="font-medium">Téléphone:</span>{' '}
                    {selectedAppointment.phone_number ? (
                      <a href={`tel:${selectedAppointment.phone_number}`} className="text-blue-600 hover:underline">
                        {selectedAppointment.phone_number}
                      </a>
                    ) : (
                      <span className="text-orange-600 italic">
                        Non renseigné - Contacter par email
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Détails rendez-vous */}
              <div className="border border-gray-200 p-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Détails du Rendez-vous
                </h3>
                <div className="space-y-1 text-xs">
                  <p><span className="font-medium">Type:</span> {selectedAppointment.event_type}</p>
                  <p><span className="font-medium">Date:</span> {selectedAppointment.formatted_start || selectedAppointment.start_time}</p>
                  <p><span className="font-medium">Durée:</span> {selectedAppointment.formatted_time || `${selectedAppointment.formatted_start} - ${selectedAppointment.formatted_end}`}</p>
                  <p><span className="font-medium">Fuseau horaire:</span> {selectedAppointment.timezone}</p>
                  <p><span className="font-medium">Statut:</span> {STATUS_LABELS[selectedAppointment.status]?.label || selectedAppointment.status}</p>
                </div>
              </div>

              {/* Lien de visioconférence */}
              {selectedAppointment.meeting_url && (
                <div className="border border-green-200 bg-green-50 p-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    🎥 Lien de Visioconférence
                  </h3>
                  <a
                    href={selectedAppointment.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 text-xs font-medium bg-green-600 text-white hover:bg-green-700 border-0"
                  >
                    Rejoindre la visioconférence →
                  </a>
                  <p className="text-xs text-gray-600 mt-2">
                    Lien: {selectedAppointment.meeting_url}
                  </p>
                </div>
              )}

              {/* Configuration URL */}
              {selectedAppointment.config_url && (
                <div className="border border-gray-200 p-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Configuration
                  </h3>
                  <a
                    href={selectedAppointment.config_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline break-all"
                  >
                    {selectedAppointment.config_url}
                  </a>
                </div>
              )}

              {/* Notes additionnelles */}
              {selectedAppointment.additional_notes && (
                <div className="border border-gray-200 p-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Notes Additionnelles
                  </h3>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">
                    {selectedAppointment.additional_notes}
                  </p>
                </div>
              )}

              {/* Status emails */}
              <div className="border border-gray-200 p-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Emails Envoyés
                </h3>
                <div className="space-y-1 text-xs">
                  <p className={selectedAppointment.confirmation_sent ? 'text-green-600' : 'text-gray-500'}>
                    {selectedAppointment.confirmation_sent ? '✓' : '○'} Email de confirmation
                  </p>
                  <p className={selectedAppointment.reminder_24h_sent ? 'text-green-600' : 'text-gray-500'}>
                    {selectedAppointment.reminder_24h_sent ? '✓' : '○'} Rappel 24h avant
                  </p>
                  <p className={selectedAppointment.reminder_1h_sent ? 'text-green-600' : 'text-gray-500'}>
                    {selectedAppointment.reminder_1h_sent ? '✓' : '○'} Rappel 1h avant
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-between">
              <div className="flex gap-2">
                {selectedAppointment.status === 'scheduled' && (
                  <>
                    <button
                      onClick={() => handleAction(selectedAppointment.id, 'complete')}
                      className="px-3 py-2 text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      disabled={isActionLoading}
                    >
                      ✅ Marquer terminé
                    </button>
                    <button
                      onClick={() => handleAction(selectedAppointment.id, 'cancel')}
                      className="px-3 py-2 text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      disabled={isActionLoading}
                    >
                      ❌ Annuler
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => !isActionLoading && setSelectedAppointment(null)}
                className="px-4 py-2 text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:border-gray-900 disabled:opacity-50"
                disabled={isActionLoading}
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
