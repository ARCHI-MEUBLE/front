"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { User } from "lucide-react";
import type { UserSession } from "@/lib/auth";
import { ProfileModal } from "@/components/ProfileModal";

type Meuble = {
  userId: string;
  name: string;
  image: string;
};

type SessionResponse = {
  user: UserSession;
  meubles: Meuble[];
};

export function AccountButton() {
  const router = useRouter();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchSession = async () => {
      try {
        const response = await fetch("/api/session", {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!isMounted) return;
        if (response.ok) {
          const data: SessionResponse = await response.json();
          setSession(data);
        } else {
          setSession(null);
        }
      } catch (error) {
        if (isMounted) {
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshSession = async () => {
    try {
      const response = await fetch("/api/session", {
        credentials: 'include',
        cache: 'no-store',
      });
      if (response.ok) {
        const data: SessionResponse = await response.json();
        setSession(data);
      }
    } catch (error) {
      setSession(null);
    }
  };

  const handleClick = () => {
    if (loading) return;
    if (session) {
      setModalOpen(true);
    } else {
      router.push("/login");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/session", { method: "DELETE", credentials: 'include' });
    setSession(null);
    setModalOpen(false);
    router.push("/");
  };

  const handlePasswordChange = async () => {
    await refreshSession();
  };

  return (
    <>
      <button
        type="button"
        aria-label="Ouvrir l'espace utilisateur"
        onClick={handleClick}
        className="rounded-full border border-transparent p-2 text-gray-600 transition hover:bg-gray-100"
      >
        <User className="h-5 w-5" />
      </button>
      {session && (
        <ProfileModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          session={session.user}
          meubles={session.meubles}
          onLogout={handleLogout}
          onPasswordChange={handlePasswordChange}
        />
      )}
    </>
  );
}
