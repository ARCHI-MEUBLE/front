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

// Format de session renvoyé par le backend PHP
type BackendSessionResponse = {
  authenticated: boolean;
  customer?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    address?: string;
    created_at: string;
  };
};

export function AccountButton() {
  const router = useRouter();
  const [session, setSession] = useState<BackendSessionResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchSession = async () => {
      try {
        const response = await fetch("/api/session");
        if (!isMounted) return;
        if (response.ok) {
          const data: BackendSessionResponse = await response.json();
          console.log("📥 Session fetched:", data);
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
      const response = await fetch("/api/session");
      if (response.ok) {
        const data: BackendSessionResponse = await response.json();
        setSession(data);
      }
    } catch (error) {
      setSession(null);
    }
  };

  const handleClick = () => {
    console.log("🔘 AccountButton clicked");
    console.log("📊 Loading:", loading);
    console.log("👤 Session:", session);
    
    if (loading) {
      console.log("⏳ Loading, returning early");
      return;
    }
    
    if (session?.authenticated && session?.customer) {
      console.log("✅ Session exists, opening modal");
      setModalOpen(true);
    } else {
      console.log("❌ No session, redirecting to /auth/login");
      router.push("/auth/login");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/session", { method: "DELETE" });
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
      <ProfileModal
        isOpen={modalOpen && session?.authenticated === true && !!session?.customer}
        onClose={() => setModalOpen(false)}
        session={session?.customer ? {
          id: String(session.customer.id),
          email: session.customer.email,
          name: `${session.customer.first_name} ${session.customer.last_name}`,
        } : null}
        meubles={[]}
        onLogout={handleLogout}
        onPasswordChange={handlePasswordChange}
      />
    </>
  );
}
