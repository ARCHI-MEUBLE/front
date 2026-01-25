import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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
}

interface RegisterResult {
  success: boolean;
  message: string;
  requiresVerification?: boolean;
  email?: string;
}

interface CustomerContextType {
  customer: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  updateProfile: (data: Partial<Customer>) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; message: string }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerificationCode: (email: string) => Promise<{ success: boolean; message: string }>;
}

interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

const API_BASE_URL = '/backend/api';

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/customers/login.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Échec de la connexion');
    }

    const data = await res.json();
    setCustomer(data.customer);
  };

  const register = async (data: RegisterData): Promise<RegisterResult> => {
    const res = await fetch(`${API_BASE_URL}/customers/register.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Échec de l\'inscription');
    }

    // Si vérification requise, ne pas connecter l'utilisateur
    if (result.requiresVerification) {
      return {
        success: true,
        message: result.message,
        requiresVerification: true,
        email: result.email,
      };
    }

    // Ancien flux (si vérification désactivée)
    if (result.customer) {
      setCustomer(result.customer);
    }

    return {
      success: true,
      message: result.message,
      requiresVerification: false,
    };
  };

  const verifyEmail = async (email: string, code: string) => {
    const res = await fetch(`${API_BASE_URL}/customers/verify-email.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, code }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Code invalide');
    }

    // Connexion automatique après vérification
    if (result.customer) {
      setCustomer(result.customer);
    }
  };

  const resendVerificationCode = async (email: string) => {
    const res = await fetch(`${API_BASE_URL}/customers/resend-code.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Une erreur est survenue');
    }
    return data;
  };

  const forgotPassword = async (email: string) => {
    const res = await fetch(`${API_BASE_URL}/customers/forgot-password.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Une erreur est survenue');
    }
    return data;
  };

  const resetPassword = async (token: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/customers/reset-password.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Une erreur est survenue');
    }
    return data;
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/customers/session.php`, {
        method: 'DELETE',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setCustomer(null);
    }
  };

  const updateProfile = async (data: Partial<Customer>) => {
    const res = await fetch(`${API_BASE_URL}/customers/profile.php`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Échec de la mise à jour');
    }

    const result = await res.json();
    setCustomer(result.customer);
  };

  return (
    <CustomerContext.Provider
      value={{
        customer,
        isAuthenticated: !!customer,
        isLoading,
        login,
        register,
        logout,
        checkSession,
        updateProfile,
        forgotPassword,
        resetPassword,
        verifyEmail,
        resendVerificationCode,
      }}
    >
      {children}
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
