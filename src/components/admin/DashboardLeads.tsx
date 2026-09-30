"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuoteRequestsPanel } from '@/components/admin/leads/QuoteRequestsPanel';
import { ContactRequestsPanel } from '@/components/admin/leads/ContactRequestsPanel';

export function DashboardLeads() {
  return (
    <Tabs defaultValue="quotes" className="w-full">
      <TabsList className="grid w-full grid-cols-2 gap-2 mb-6 bg-muted/50 p-2">
        <TabsTrigger value="quotes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
          Demandes de devis
        </TabsTrigger>
        <TabsTrigger value="contact" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
          Messages de contact
        </TabsTrigger>
      </TabsList>
      <TabsContent value="quotes">
        <QuoteRequestsPanel />
      </TabsContent>
      <TabsContent value="contact">
        <ContactRequestsPanel />
      </TabsContent>
    </Tabs>
  );
}
