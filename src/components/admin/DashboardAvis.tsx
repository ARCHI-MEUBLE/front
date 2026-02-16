"use client"

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/dateUtils';
import toast from 'react-hot-toast';
import {
  IconStar,
  IconStarFilled,
  IconTrash,
  IconRefresh,
  IconTrendingUp,
  IconTrendingDown,
  IconMessage,
} from '@tabler/icons-react';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setAvis((prev) => prev.filter((a) => a.id !== id));
        toast.success('Avis supprimé');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression de l\'avis');
    } finally {
      setDeleting(null);
    }
  };

  const averageRating = avis.length > 0
    ? (avis.reduce((sum, review) => sum + review.rating, 0) / avis.length)
    : 0;

  const satisfaction = avis.length > 0 ? (averageRating / 5) * 100 : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => {
    const count = avis.filter(review => review.rating === rating).length;
    const percentage = avis.length > 0 ? (count / avis.length) * 100 : 0;
    return { rating, count, percentage };
  });

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          star <= rating ? (
            <IconStarFilled key={star} className="size-4 text-yellow-500" />
          ) : (
            <IconStar key={star} className="size-4 text-muted-foreground" />
          )
        ))}
      </div>
    );
  };

  if (loading) {
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
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-3">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Avis</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {avis.length}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <IconMessage className="size-3" />
                Tous
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Avis clients collectés <IconMessage className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Depuis le début
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Note Moyenne</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {averageRating.toFixed(1)} / 5
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                {averageRating >= 4 ? (
                  <><IconTrendingUp className="size-3" /> Excellent</>
                ) : averageRating >= 3 ? (
                  <><IconStar className="size-3" /> Bon</>
                ) : (
                  <><IconTrendingDown className="size-3" /> À améliorer</>
                )}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {renderStars(Math.round(averageRating))}
            </div>
            <div className="text-muted-foreground">
              Moyenne globale
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Satisfaction</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {satisfaction.toFixed(0)}%
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                {satisfaction >= 80 ? (
                  <><IconTrendingUp className="size-3" /> +{satisfaction.toFixed(0)}%</>
                ) : (
                  <><IconTrendingDown className="size-3" /> {satisfaction.toFixed(0)}%</>
                )}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Taux de satisfaction <IconTrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Basé sur la note moyenne
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Distribution & Liste */}
      <div className="px-4 lg:px-6 space-y-6">
        {/* Distribution des notes */}
        <Card>
          <CardHeader>
            <CardTitle>Distribution des Notes</CardTitle>
            <CardDescription>Répartition des avis par nombre d'étoiles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ratingDistribution.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center gap-4">
                  <div className="flex items-center gap-1 w-12">
                    <IconStarFilled className="size-4 text-yellow-500" />
                    <span className="text-sm font-medium">{rating}</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Liste des avis */}
        <Card>
          <CardHeader>
            <CardTitle>Tous les Avis</CardTitle>
            <CardDescription>Gérer et modérer les avis clients</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {avis.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-4xl mb-3">⭐</div>
                <h3 className="text-lg font-medium mb-1">Aucun avis client</h3>
                <p className="text-sm text-muted-foreground">
                  Aucun avis pour le moment
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="hidden md:table-cell">Commentaire</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {avis.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell className="font-medium">{review.authorName}</TableCell>
                      <TableCell>{renderStars(review.rating)}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-md">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {review.text}
                        </p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {formatDate(review.date)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleDelete(review.id)}
                          disabled={deleting === review.id}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <IconTrash className="w-4 h-4 mr-1" />
                          Supprimer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
