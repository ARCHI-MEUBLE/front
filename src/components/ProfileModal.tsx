"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import type { UserSession } from "@/lib/auth";

type Meuble = {
  userId: string;
  name: string;
  image: string;
};

type ProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession | null;
  meubles: Meuble[];
  onLogout: () => void;
  onPasswordChange?: () => void;
};

export function ProfileModal({
  isOpen,
  onClose,
  session,
  meubles,
  onLogout,
  onPasswordChange
}: ProfileModalProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ➕ Ajout ref pour la détection de clic extérieur
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setShowPasswordForm(false);
      setShowDeleteForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setDeletePassword("");
      setStatusMessage(null);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  
  // Vérification de sécurité
  if (!session) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setStatusMessage(null);
    setError(null);

    try {
      const response = await fetch("/backend/api/account/password.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? "Impossible de mettre à jour le mot de passe");
      }

      setStatusMessage("Mot de passe mis à jour avec succès");
      setCurrentPassword("");
      setNewPassword("");
      onPasswordChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.")) {
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    setError(null);

    try {
      const response = await fetch("/backend/api/account/delete.php", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: deletePassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de supprimer le compte");
      }

      alert("Votre compte a été supprimé avec succès");
      onLogout();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-[36px] border border-[#e0d7cc] bg-white/95 p-10 shadow-2xl backdrop-blur"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 rounded-full p-2 text-ink/50 transition hover:bg-[#ede3d7]"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <h2 className="heading-serif text-3xl text-ink">Mon compte</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/60">
            Gérez vos informations et vos meubles enregistrés.
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-[#e7ded3] bg-alabaster/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink/50">Email</p>
            <p className="mt-2 text-base font-semibold text-ink">{session.email}</p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowPasswordForm((value) => !value)}
              className="w-full rounded-full bg-ink px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#14100f]"
            >
              {showPasswordForm ? "Annuler" : "Changer de mot de passe"}
            </button>

            {showPasswordForm && (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-ink/50" htmlFor="currentPassword">
                    Mot de passe actuel
                  </label>
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#e0d7cc] bg-white px-4 py-3 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-ink/50" htmlFor="newPassword">
                    Nouveau mot de passe
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#e0d7cc] bg-white px-4 py-3 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-ink px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#14100f] disabled:cursor-not-allowed disabled:bg-ink/60"
                >
                  {loading ? "Enregistrement..." : "Valider"}
                </button>
                {error && <p className="text-sm text-red-500">{error}</p>}
                {statusMessage && <p className="text-sm text-emerald-600">{statusMessage}</p>}
              </form>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowDeleteForm((value) => !value)}
              className="w-full rounded-full border-2 border-red-600 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-red-600 transition hover:bg-red-50"
            >
              {showDeleteForm ? "Annuler" : "Supprimer mon compte"}
            </button>

            {showDeleteForm && (
              <form onSubmit={handleDeleteAccount} className="mt-4 space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-800 font-semibold">
                    ⚠️ ATTENTION : Cette action est irréversible. Toutes vos données seront définitivement supprimées.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-ink/50" htmlFor="deletePassword">
                    Confirmer avec votre mot de passe
                  </label>
                  <input
                    id="deletePassword"
                    name="deletePassword"
                    type="password"
                    required
                    value={deletePassword}
                    onChange={(event) => setDeletePassword(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#e0d7cc] bg-white px-4 py-3 text-sm text-ink focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/10"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-red-600 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-600/60"
                >
                  {loading ? "Suppression..." : "Confirmer la suppression"}
                </button>
                {error && <p className="text-sm text-red-500">{error}</p>}
              </form>
            )}
          </div>

          <div>
            <h3 className="heading-serif text-xl text-ink">Mes meubles</h3>
            {!meubles || meubles.length === 0 ? (
              <p className="mt-2 text-sm text-ink/60">
                Vous n&apos;avez pas encore enregistré de meuble.
              </p>
            ) : (
              <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {meubles.map((meuble) => (
                  <li
                    key={`${meuble.userId}-${meuble.name}`}
                    className="flex items-center space-x-3 rounded-2xl border border-[#e7ded3] bg-white/80 p-3 shadow-sm"
                  >
                    <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-gray-100">
                      <Image
                        src={meuble.image}
                        alt={meuble.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                    <span className="text-sm font-medium text-ink">{meuble.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="mt-8 w-full rounded-full border border-[#e0d7cc] bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-ink/70 transition hover:border-ink hover:text-ink"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
