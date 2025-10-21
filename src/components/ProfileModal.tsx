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
  session: UserSession;
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ➕ Ajout ref pour la détection de clic extérieur
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setStatusMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 rounded-full p-2 text-gray-500 transition hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Mon compte</h2>
          <p className="mt-1 text-sm text-gray-500">
            Gérez vos informations et vos meubles enregistrés.
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="mt-1 text-base font-semibold text-gray-900">{session.email}</p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowPasswordForm((value) => !value)}
              className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {showPasswordForm ? "Annuler" : "Changer de mot de passe"}
            </button>

            {showPasswordForm && (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="currentPassword">
                    Mot de passe actuel
                  </label>
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="newPassword">
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
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Enregistrement..." : "Valider"}
                </button>
                {error && <p className="text-sm text-red-500">{error}</p>}
                {statusMessage && <p className="text-sm text-emerald-600">{statusMessage}</p>}
              </form>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900">Mes meubles</h3>
            {!meubles || meubles.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">
                Vous n&apos;avez pas encore enregistré de meuble.
              </p>
            ) : (
              <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {meubles.map((meuble) => (
                  <li
                    key={`${meuble.userId}-${meuble.name}`}
                    className="flex items-center space-x-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
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
                    <span className="text-sm font-medium text-gray-700">{meuble.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="mt-8 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
