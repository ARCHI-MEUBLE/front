"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import { useCustomer } from "@/context/CustomerContext";

type Mode = "login" | "register";

export function LoginForm() {
  const router = useRouter();
  const { login, register } = useCustomer();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
        await login(email, password);
      } else {
        // Validation inscription
        if (password.length < 8) {
          throw new Error("Le mot de passe doit contenir au moins 8 caractères");
        }
        if (!firstName || !lastName) {
          throw new Error("Prénom et nom sont requis");
        }
        
        await register({
          email,
          password,
          first_name: firstName,
          last_name: lastName
        });
      }

      // Rediriger vers mes configurations après connexion/inscription
      router.push("/my-configurations");
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
          <>
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                Prénom *
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Nom *
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </>
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
            Mot de passe {mode === "register" && "(min. 8 caractères)"}
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={mode === "register" ? 8 : 1}
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
