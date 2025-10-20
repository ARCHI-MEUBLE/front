"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/router";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ children, redirectTo = "/login" }: ProtectedRouteProps) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;

    const verifySession = async () => {
      try {
        const response = await fetch("/api/session");
        if (!active) return;
        if (response.ok) {
          setAllowed(true);
        } else {
          router.replace(redirectTo);
        }
      } catch (error) {
        if (!active) return;
        router.replace(redirectTo);
      } finally {
        if (active) {
          setChecked(true);
        }
      }
    };

    verifySession();

    return () => {
      active = false;
    };
  }, [redirectTo, router]);

  if (!checked) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500">
        Vérification de votre session...
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
