"use client";

import { useState } from "react";
import { useRouter } from "next/router";

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
      const endpoint = mode === "login" ? "/api/login" : "/api/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? "Une erreur est survenue");
      }

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de se connecter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
      <h1 className="text-2xl font-semibold text-gray-900">
        {mode === "login" ? "Connexion à ArchiMeuble" : "Créer un compte"}
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        {mode === "login"
          ? "Renseignez vos identifiants pour accéder à vos projets."
          : "Créez votre espace personnel pour sauvegarder vos meubles."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "register" && (
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nom (optionnel)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Veuillez patienter..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        {mode === "login" ? "Pas encore de compte ?" : "Déjà inscrit ?"}{" "}
        <button type="button" onClick={toggleMode} className="text-sm font-semibold text-amber-600 hover:underline">
          {mode === "login" ? "Créer un compte" : "Se connecter"}
        </button>
      </p>
    </div>
  );
}
