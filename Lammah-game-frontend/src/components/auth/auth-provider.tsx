'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/endpoints';
import { TOKEN_KEY, USER_KEY } from '@/lib/api/client';
import { AuthResponse, LoginPayload, RegisterPayload, User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (data: LoginPayload) => Promise<AuthResponse>;
  register: (data: RegisterPayload) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type LoginResponseShape =
  | AuthResponse
  | {
      access_token?: string;
      token?: string;
      data?: AuthResponse | { access_token?: string; token?: string; user?: User };
      user?: User;
    };

function normalizeUser(response: User | { data?: User } | { user?: User }): User | null {
  if ('data' in response && response.data) return response.data;
  if ('user' in response && response.user) return response.user;
  if ('email' in response && 'role' in response) return response as User;
  return null;
}

function getAccessToken(response: LoginResponseShape): string | undefined {
  const payload = 'data' in response && response.data ? response.data : response;

  return (
    'accessToken' in payload
      ? payload.accessToken
      : 'access_token' in payload
        ? payload.access_token
        : 'token' in payload
          ? payload.token
          : undefined
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistUser = useCallback((nextUser: User | null) => {
    setUser(nextUser);
    if (typeof window === 'undefined') return;

    if (nextUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const nextUser = normalizeUser(await authApi.me());
    if (!nextUser) {
      throw new Error('Unable to read user from /auth/me response');
    }
    persistUser(nextUser);
  }, [persistUser]);

  useEffect(() => {
    const bootstrap = async () => {
      if (typeof window === 'undefined') return;

      const token = localStorage.getItem(TOKEN_KEY);
      const cachedUser = localStorage.getItem(USER_KEY);

      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
        } catch {
          localStorage.removeItem(USER_KEY);
        }
      }

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        await refreshUser();
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, [refreshUser]);

  const login = useCallback(async (data: LoginPayload) => {
    const rawResponse = await authApi.login(data);
    const accessToken = getAccessToken(rawResponse);

    if (!accessToken) {
      throw new Error('Login response is missing access token');
    }

    localStorage.setItem(TOKEN_KEY, accessToken);

    const payload = 'data' in rawResponse && rawResponse.data ? rawResponse.data : rawResponse;
    const responseUser = normalizeUser(payload);
    const nextUser = responseUser || normalizeUser(await authApi.me());

    if (!nextUser) {
      throw new Error('Login succeeded but user profile was not returned');
    }

    persistUser(nextUser);

    return {
      accessToken,
      user: nextUser,
    };
  }, [persistUser]);

  const register = useCallback(async (data: RegisterPayload) => {
    await authApi.register(data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    persistUser(null);
    router.push('/login');
  }, [persistUser, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      login,
      register,
      refreshUser,
      logout,
    }),
    [user, isLoading, login, register, refreshUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
