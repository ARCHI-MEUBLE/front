"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import { apiClient } from "@/lib/apiClient";

type Mode = "login" | "register";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleMode = () => {
    setMode((prev) => (prev === "login" ? "register" : "login"));
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        await apiClient.auth.login(email, password);
      } else {
        await apiClient.auth.register(email, password, name || undefined);
      }

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de se connecter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-sm border border-border bg-white/90 p-10 shadow-lg backdrop-blur">
      <h1 className="font-serif text-3xl text-ink">
        {mode === "login" ? "Connexion à ArchiMeuble" : "Créer un compte"}
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-stone">
        {mode === "login"
          ? "Renseignez vos identifiants pour accéder à vos projets."
          : "Créez votre espace personnel pour sauvegarder vos meubles."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {mode === "register" && (
          <div>
            <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted">
              Nom (optionnel)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-sm border border-[#e0d7cc] bg-white px-4 py-3 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>
        )}
        <div>
          <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-sm border border-[#e0d7cc] bg-white px-4 py-3 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-sm border border-[#e0d7cc] bg-white px-4 py-3 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-ink px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#14100f] disabled:cursor-not-allowed disabled:bg-ink/60"
        >
          {loading ? "Veuillez patienter..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-ink/60">
        {mode === "login" ? "Pas encore de compte ?" : "Déjà inscrit ?"}{" "}
        <button type="button" onClick={toggleMode} className="font-semibold text-ink hover:underline">
          {mode === "login" ? "Créer un compte" : "Se connecter"}
        </button>
      </p>
    </div>
  );
}
