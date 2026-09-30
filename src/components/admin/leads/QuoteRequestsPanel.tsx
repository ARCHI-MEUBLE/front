"use client"

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/dateUtils';
import { IconFileText, IconPaperclip } from '@tabler/icons-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface QuoteRequest {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  description: string;
  status: string;
  created_at: string;
  file_count: number;
}

export function QuoteRequestsPanel() {
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [selected, setSelected] = useState<QuoteRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/backend/api/quote-request/index.php', { credentials: 'include' });
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
          <IconFileText className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucune demande de devis pour le moment</p>
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
              <TableHead>Client</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Fichiers</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Reçu le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id} className="cursor-pointer" onClick={() => setSelected(request)}>
                <TableCell className="font-medium">{request.first_name} {request.last_name}</TableCell>
                <TableCell>
                  <div className="flex flex-col text-sm">
                    <span>{request.email}</span>
                    <span className="text-muted-foreground">{request.phone}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {request.file_count > 0 ? (
                    <Badge variant="secondary" className="gap-1">
                      <IconPaperclip className="h-3 w-3" />
                      {request.file_count}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
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
                <SheetTitle>{selected.first_name} {selected.last_name}</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                  <a href={`mailto:${selected.email}`} className="text-sm">{selected.email}</a>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Téléphone</p>
                  <a href={`tel:${selected.phone}`} className="text-sm">{selected.phone}</a>
                </div>
                {selected.description && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Message</p>
                    <p className="whitespace-pre-wrap text-sm">{selected.description}</p>
                  </div>
                )}
                {selected.file_count > 0 && (
                  <p className="text-sm text-muted-foreground">{selected.file_count} fichier(s) joint(s) — non téléchargeables depuis cette vue pour le moment.</p>
                )}
                <p className="text-xs text-muted-foreground">Reçu le {formatDate(selected.created_at)}</p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
