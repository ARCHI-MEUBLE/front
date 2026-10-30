import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import EmailCodeModal from '@/components/auth/EmailCodeModal';

interface Customer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  civility?: 'M' | 'Mme';
}

export type LoginCodeRequest = { sent: true } | { needsName: true };

interface CustomerContextType {
  customer: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkSession: () => Promise<void>;
  requestLoginCode: (email: string, firstName?: string, lastName?: string) => Promise<LoginCodeRequest>;
  verifyLoginCode: (email: string, code: string) => Promise<void>;
  /** Plus de compte client : une action qui doit savoir qui commande ouvre la confirmation par code email. Résout true une fois l'email confirmé, false si le visiteur ferme la fenêtre. */
  requireIdentity: () => Promise<boolean>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

const API_BASE_URL = '/backend/api';

async function postJson(path: string, body: unknown) {
  const res = await fetch(`${API_BASE_URL}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Erreur serveur. Veuillez réessayer.');
  }
  return { res, data: await res.json() };
}

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pendingIdentity = useRef<((confirmed: boolean) => void) | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/customers/session.php`, {
        credentials: 'include', // Important pour les sessions
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.customer) {
          setCustomer(data.customer);
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestLoginCode = async (email: string, firstName?: string, lastName?: string): Promise<LoginCodeRequest> => {
    const { res, data } = await postJson('customers/email-code.php', { email, first_name: firstName, last_name: lastName });
    if (data.needsName) {
      return { needsName: true };
    }
    if (!res.ok) {
      throw new Error(data.error || "Impossible d'envoyer le code");
    }
    return { sent: true };
  };

  const verifyLoginCode = async (email: string, code: string) => {
    const { res, data } = await postJson('customers/email-verify.php', { email, code });
    if (!res.ok) {
      throw new Error(data.error || 'Code invalide');
    }
    setCustomer(data.customer);
  };

  const settleIdentity = (confirmed: boolean) => {
    setIsModalOpen(false);
    pendingIdentity.current?.(confirmed);
    pendingIdentity.current = null;
  };

  const requireIdentity = useCallback((): Promise<boolean> => {
    if (customer) return Promise.resolve(true);
    // Une seule fenêtre à la fois : une demande précédente restée ouverte est considérée comme abandonnée
    pendingIdentity.current?.(false);
    setIsModalOpen(true);
    return new Promise<boolean>((resolve) => {
      pendingIdentity.current = resolve;
    });
  }, [customer]);

  return (
    <CustomerContext.Provider
      value={{
        customer,
        isAuthenticated: !!customer,
        isLoading,
        checkSession,
        requestLoginCode,
        verifyLoginCode,
        requireIdentity,
      }}
    >
      {children}
      <EmailCodeModal
        isOpen={isModalOpen}
        requestCode={requestLoginCode}
        verifyCode={verifyLoginCode}
        onClose={() => settleIdentity(false)}
        onSuccess={() => settleIdentity(true)}
      />
    </CustomerContext.Provider>
  );
}

export const useCustomer = () => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
};
