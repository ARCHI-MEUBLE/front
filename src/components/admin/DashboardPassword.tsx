"use client"

import { useEffect, useState } from "react";
import toast from 'react-hot-toast';
import {
  IconKey,
  IconShield,
  IconUser,
  IconTrash,
  IconRefresh,
  IconEye,
  IconEyeOff,
  IconPalette,
  IconMoon,
  IconSun,
  IconUserCircle,
} from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

type User = {
  id: string;
  email: string;
  name: string | null;
  type: "user";
  created_at: string;
};

type Admin = {
  id: number;
  email: string;
  username: string | null;
  type: "admin";
  created_at: string;
};

type Account = User | Admin;

export function DashboardPassword() {
  const [users, setUsers] = useState<User[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Theme settings
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [accentColor, setAccentColor] = useState("#3b82f6");
  const [darkMode, setDarkMode] = useState(false);

  const hexToHSL = (hex: string) => {
    // Convert hex to RGB
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '0 0% 0%';

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
  };

  const applyTheme = (primary: string, accent: string, dark: boolean) => {
    // Convert hex to HSL for shadcn/ui
    const primaryHSL = hexToHSL(primary);
    const accentHSL = hexToHSL(accent);

    // Remove existing theme style if it exists
    const existingStyle = document.getElementById('custom-theme');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create and inject custom CSS
    const styleElement = document.createElement('style');
    styleElement.id = 'custom-theme';
    styleElement.innerHTML = `
      :root {
        --primary: ${primaryHSL} !important;
        --accent: ${accentHSL} !important;
        --sidebar-primary: ${primaryHSL} !important;
        --sidebar-accent: ${accentHSL} !important;
      }
    `;
    document.head.appendChild(styleElement);

    // Apply dark mode
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  useEffect(() => {
    fetchAccounts();
    loadThemeSettings();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin-users", {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error("Impossible de récupérer les comptes");
      }

      const data = await response.json();
      setUsers(data.users || []);
      setAdmins(data.admins || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const loadThemeSettings = () => {
    const savedPrimary = localStorage.getItem('theme-primary') || "#000000";
    const savedAccent = localStorage.getItem('theme-accent') || "#3b82f6";
    const savedDarkMode = localStorage.getItem('theme-dark-mode') === 'true';

    setPrimaryColor(savedPrimary);
    setAccentColor(savedAccent);
    setDarkMode(savedDarkMode);

    // Apply saved theme
    if (localStorage.getItem('theme-primary')) {
      applyTheme(savedPrimary, savedAccent, savedDarkMode);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!selectedAccount) return;

    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    try {
      setUpdating(true);

      const response = await fetch("/api/admin-users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          id: selectedAccount.id,
          type: selectedAccount.type,
          newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Échec de la mise à jour");
      }

      setSelectedAccount(null);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Mot de passe modifié avec succès !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de mise à jour");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (account: Account) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le compte ${account.email} ?`)) {
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch("/api/admin-users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          id: account.id,
          type: account.type,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Échec de la suppression");
      }

      await fetchAccounts();
      toast.success("Compte supprimé");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de suppression");
    } finally {
      setDeleting(false);
    }
  };

  const handleThemeUpdate = () => {
    localStorage.setItem('theme-primary', primaryColor);
    localStorage.setItem('theme-accent', accentColor);
    localStorage.setItem('theme-dark-mode', darkMode.toString());

    applyTheme(primaryColor, accentColor, darkMode);

    toast.success("Thème mis à jour ! Rechargez la page pour voir tous les changements.");
  };

  const allAccounts: Account[] = [
    ...admins.map(a => ({ ...a, type: "admin" as const })),
    ...users.map(u => ({ ...u, type: "user" as const })),
  ];

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
    <div className="px-4 lg:px-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Paramètres</CardTitle>
          <CardDescription>Gérez les paramètres de votre dashboard admin</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="appearance" className="w-full">
            <div className="px-6 pt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="appearance">
                  <IconPalette className="w-4 h-4 mr-2" />
                  Apparence
                </TabsTrigger>
                <TabsTrigger value="accounts">
                  <IconUserCircle className="w-4 h-4 mr-2" />
                  Comptes
                </TabsTrigger>
              </TabsList>
            </div>

            <Separator className="my-4" />

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="px-6 pb-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Thème & Couleurs</h3>
                  <p className="text-sm text-muted-foreground">
                    Personnalisez l'apparence de votre dashboard
                  </p>
                </div>

                <div className="grid gap-4">
                  {/* Dark Mode Toggle */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Mode sombre</Label>
                      <p className="text-sm text-muted-foreground">
                        Activer le thème sombre
                      </p>
                    </div>
                    <Button
                      variant={darkMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDarkMode(!darkMode)}
                    >
                      {darkMode ? (
                        <>
                          <IconMoon className="w-4 h-4 mr-2" />
                          Activé
                        </>
                      ) : (
                        <>
                          <IconSun className="w-4 h-4 mr-2" />
                          Désactivé
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Primary Color */}
                  <div className="rounded-lg border p-4 space-y-3">
                    <div>
                      <Label htmlFor="primary-color" className="text-base">Couleur principale</Label>
                      <p className="text-sm text-muted-foreground">
                        Couleur primaire du dashboard (boutons, liens, etc.)
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          id="primary-color"
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="h-10 w-20 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          placeholder="#000000"
                          className="font-mono"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrimaryColor("#000000")}
                      >
                        Réinitialiser
                      </Button>
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div className="rounded-lg border p-4 space-y-3">
                    <div>
                      <Label htmlFor="accent-color" className="text-base">Couleur d'accentuation</Label>
                      <p className="text-sm text-muted-foreground">
                        Couleur secondaire pour les éléments d'interface
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          id="accent-color"
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="h-10 w-20 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          placeholder="#3b82f6"
                          className="font-mono"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAccentColor("#3b82f6")}
                      >
                        Réinitialiser
                      </Button>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="rounded-lg border p-4 space-y-3">
                    <Label className="text-base">Aperçu</Label>
                    <div className="flex gap-2">
                      <Button style={{ backgroundColor: primaryColor }}>
                        Bouton principal
                      </Button>
                      <Button variant="outline" style={{ borderColor: accentColor, color: accentColor }}>
                        Bouton secondaire
                      </Button>
                    </div>
                  </div>

                  <Button onClick={handleThemeUpdate} className="w-full">
                    Appliquer les modifications
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Accounts Tab */}
            <TabsContent value="accounts" className="px-6 pb-6 space-y-4">
              <div>
                <h3 className="text-lg font-medium">Gestion des comptes</h3>
                <p className="text-sm text-muted-foreground">
                  {allAccounts.length} compte{allAccounts.length > 1 ? 's' : ''} ({admins.length} admin{admins.length > 1 ? 's' : ''}, {users.length} utilisateur{users.length > 1 ? 's' : ''})
                </p>
              </div>

              {allAccounts.length === 0 ? (
                <div className="rounded-lg border border-dashed p-12 text-center">
                  <div className="text-4xl mb-3">👤</div>
                  <h3 className="text-lg font-medium mb-1">Aucun compte</h3>
                  <p className="text-sm text-muted-foreground">
                    Aucun compte enregistré
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="hidden md:table-cell">Email</TableHead>
                        <TableHead className="hidden sm:table-cell">ID</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allAccounts.map((account) => (
                        <TableRow key={`${account.type}-${account.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {account.type === 'admin' ? (
                                <IconShield className="w-4 h-4 text-primary" />
                              ) : (
                                <IconUser className="w-4 h-4 text-muted-foreground" />
                              )}
                              <span>
                                {account.type === 'admin'
                                  ? (account as Admin).username || 'Admin'
                                  : (account as User).name || 'User'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={account.type === 'admin' ? 'default' : 'secondary'}>
                              {account.type === 'admin' ? 'Admin' : 'User'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {account.email}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            #{account.id}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                onClick={() => setSelectedAccount(account)}
                                variant="ghost"
                                size="sm"
                              >
                                <IconKey className="w-4 h-4 mr-1" />
                                <span className="hidden sm:inline">Mot de passe</span>
                              </Button>
                              <Button
                                onClick={() => handleDelete(account)}
                                disabled={deleting}
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <IconTrash className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Password Update Dialog */}
      <Dialog open={!!selectedAccount} onOpenChange={(open) => !open && setSelectedAccount(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier le mot de passe</DialogTitle>
            <DialogDescription>
              Modifier le mot de passe pour {selectedAccount?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <IconEyeOff className="h-4 w-4" />
                  ) : (
                    <IconEye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmer le mot de passe"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedAccount(null)}
              disabled={updating}
            >
              Annuler
            </Button>
            <Button
              onClick={handlePasswordUpdate}
              disabled={updating || !newPassword || !confirmPassword}
            >
              {updating ? (
                <>
                  <IconRefresh className="w-4 h-4 mr-2 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                <>
                  <IconKey className="w-4 h-4 mr-2" />
                  Modifier
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
