import { useEffect, useState } from 'react';
import { Trash2, Star } from 'lucide-react';

type Review = {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  date: string;
};

export function DashboardAvis() {
  const [avis, setAvis] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchAvis();
  }, []);

  const fetchAvis = async () => {
    try {
      const res = await fetch('/api/reviews');
      if (res.ok) {
        const data = await res.json();
        setAvis(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des avis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet avis ?')) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAvis((prev) => prev.filter((a) => a.id !== id));
      } else {
        const error = await res.json();
        alert(error.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de l\'avis');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Chargement des avis...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des avis clients</h2>
          <p className="mt-1 text-sm text-gray-500">
            {avis.length} avis au total
          </p>
        </div>
      </div>

      {avis.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">Aucun avis client pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {avis.map((review) => (
            <div
              key={review.id}
              className="flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{review.authorName}</h3>
                      <div className="flex items-center gap-1 text-yellow-500">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating ? 'fill-current' : 'stroke-current fill-none'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{review.date}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(review.id)}
                    disabled={deleting === review.id}
                    className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleting === review.id ? 'Suppression...' : 'Supprimer'}
                  </button>
                </div>
                <p className="mt-3 text-sm text-gray-700">{review.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
