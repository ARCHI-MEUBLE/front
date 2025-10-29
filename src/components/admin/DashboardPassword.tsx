import { useEffect, useState } from "react";
import { Eye, EyeOff, Key, Mail, User as UserIcon, Shield, Trash2 } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin-users");

      if (!response.ok) {
        throw new Error("Impossible de récupérer les comptes");
      }

      const data = await response.json();
      setUsers(data.users || []);
      setAdmins(data.admins || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!selectedAccount) return;

    // Validation
    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    try {
      setUpdating(true);
      setError(null);

      const response = await fetch("/api/admin-users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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

      // Reset form
      setSelectedAccount(null);
      setNewPassword("");
      setConfirmPassword("");
      alert("Mot de passe modifié avec succès !");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (deleteConfirm !== userId) {
      setDeleteConfirm(userId);
      return;
    }

    try {
      const response = await fetch("/api/admin-users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, type: "user" }),
      });

      if (!response.ok) {
        throw new Error("Échec de la suppression");
      }

      setDeleteConfirm(null);
      await fetchAccounts();
      alert("Utilisateur supprimé avec succès");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  const allAccounts: Account[] = [
    ...admins.map(a => ({ ...a, type: "admin" as const })),
    ...users.map(u => ({ ...u, type: "user" as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (loading) {
    return (
      <section className="border border-gray-200 bg-white p-4">
        <p className="text-center text-sm text-gray-500">Chargement...</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header - sobre */}
      <div className="border border-gray-200 bg-white p-4">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Key className="h-4 w-4 text-gray-900" />
          Gestion des mots de passe
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Visualisez tous les comptes et modifiez les mots de passe de manière sécurisée.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 border border-red-300 bg-red-50 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Grid layout */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Liste des comptes - design sobre */}
        <div className="flex flex-col">
          <h3 className="mb-2 text-xs font-medium text-gray-500 uppercase">
            Tous les comptes ({allAccounts.length})
          </h3>
          <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px]">
            {allAccounts.map((account) => (
              <div
                key={`${account.type}-${account.id}`}
                className={`border p-3 cursor-pointer ${
                  selectedAccount?.id === account.id && selectedAccount?.type === account.type
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:border-gray-400"
                }`}
                onClick={() => setSelectedAccount(account)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    <div className="p-1.5 border border-gray-300">
                      {account.type === "admin" ? (
                        <Shield className="h-3 w-3 text-gray-900" />
                      ) : (
                        <UserIcon className="h-3 w-3 text-gray-900" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-gray-900">
                          {account.type === "admin"
                            ? (account as Admin).username || "Admin"
                            : (account as User).name || "Utilisateur"}
                        </p>
                        <span className="inline-flex items-center border border-gray-300 px-1.5 py-0.5 text-xs">
                          {account.type === "admin" ? "Admin" : "User"}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{account.email}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        ID: {account.id}
                      </p>
                    </div>
                  </div>

                  {account.type === "user" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteUser(account.id);
                      }}
                      className={`ml-2 border p-1 ${
                        deleteConfirm === account.id
                          ? "bg-red-50 text-red-600 border-red-300"
                          : "border-gray-300 text-gray-400 hover:text-red-600 hover:border-red-300"
                      }`}
                      title={deleteConfirm === account.id ? "Cliquez pour confirmer" : "Supprimer"}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formulaire de modification - design sobre */}
        <div className="flex flex-col h-full">
          <h3 className="mb-2 text-xs font-medium text-gray-500 uppercase">
            Modifier le mot de passe
          </h3>
          {selectedAccount ? (
            <div className="flex-1 border border-gray-200 p-4 flex flex-col">
              <div className="mb-4 border border-gray-200 p-3">
                <p className="text-xs font-medium text-gray-900">
                  {selectedAccount.type === "admin"
                    ? (selectedAccount as Admin).username || "Admin"
                    : (selectedAccount as User).name || "Utilisateur"}
                </p>
                <p className="text-xs text-gray-500 mt-1">{selectedAccount.email}</p>
                <span className="mt-2 inline-flex items-center border border-gray-300 px-1.5 py-0.5 text-xs">
                  {selectedAccount.type === "admin" ? "Administrateur" : "Utilisateur"}
                </span>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full border border-gray-300 px-3 py-2 pr-8 text-xs focus:border-gray-900 focus:outline-none"
                      placeholder="Minimum 6 caractères"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 text-xs focus:border-gray-900 focus:outline-none"
                    placeholder="Confirmez le mot de passe"
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={handlePasswordUpdate}
                  disabled={updating || !newPassword || !confirmPassword}
                  className="flex-1 bg-gray-900 text-white px-3 py-2 text-xs font-medium hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updating ? "Mise à jour..." : "Mettre à jour"}
                </button>
                <button
                  onClick={() => {
                    setSelectedAccount(null);
                    setNewPassword("");
                    setConfirmPassword("");
                    setError(null);
                  }}
                  className="border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center p-6">
              <Key className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-xs text-gray-500 text-center">
                Sélectionnez un compte pour modifier son mot de passe
              </p>
            </div>
          )}
        </div>
      </div>

    </section>
  );
}

export default DashboardPassword;
