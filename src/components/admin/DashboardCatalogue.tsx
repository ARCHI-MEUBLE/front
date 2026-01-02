"use client"

import { IconFileDescription, IconPackage } from '@tabler/icons-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function DashboardCatalogue() {
  return (
    <div className="px-4 lg:px-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconFileDescription className="w-5 h-5" />
            Catalogue & Pièces
          </CardTitle>
          <CardDescription>
            Gestion des collections et des pièces du configurateur
          </CardDescription>
        </CardHeader>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <IconPackage className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">En développement</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Cette section permettra bientôt de gérer l'organisation des collections et des pièces du configurateur.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DashboardCatalogue;
