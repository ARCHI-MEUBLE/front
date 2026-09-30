"use client"

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/dateUtils';
import { IconMessage } from '@tabler/icons-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface ContactRequest {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string | null;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
}

export function ContactRequestsPanel() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [selected, setSelected] = useState<ContactRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/backend/api/contact-request/index.php', { credentials: 'include' });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors du chargement');
      }
      setRequests(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <IconMessage className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucun message de contact pour le moment</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Coordonnées</TableHead>
              <TableHead>Sujet</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Reçu le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id} className="cursor-pointer" onClick={() => setSelected(request)}>
                <TableCell className="font-medium">
                  {request.name}
                  {request.company && <span className="block text-xs text-muted-foreground">{request.company}</span>}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-sm">
                    <span>{request.email}</span>
                    <span className="text-muted-foreground">{request.phone}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{request.subject || '—'}</TableCell>
                <TableCell>
                  <Badge variant={request.status === 'pending' ? 'default' : 'secondary'}>
                    {request.status === 'pending' ? 'En attente' : request.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(request.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent>
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4">
                {selected.company && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Entreprise</p>
                    <p className="text-sm">{selected.company}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                  <a href={`mailto:${selected.email}`} className="text-sm">{selected.email}</a>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Téléphone</p>
                  <a href={`tel:${selected.phone}`} className="text-sm">{selected.phone}</a>
                </div>
                {selected.subject && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Sujet</p>
                    <p className="text-sm">{selected.subject}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Message</p>
                  <p className="whitespace-pre-wrap text-sm">{selected.message}</p>
                </div>
                <p className="text-xs text-muted-foreground">Reçu le {formatDate(selected.created_at)}</p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
