import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  login as apiLogin, tokenStore, decodeJwt, getMe,
  type Me,
} from "../api/client";

type AuthState = {
  isAuthenticated: boolean;
  userId: number | null;
  me: Me | null;
  loadingMe: boolean;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<number | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loadingMe, setLoadingMe] = useState(false);
  const navigate = useNavigate();

  const loadMe = async () => {
    setLoadingMe(true);
    try {
      const res = await getMe();
      setMe(res.data);
    } catch {
      // If we can't load the profile (e.g., token expired), force a logout
      setMe(null);
      setUserId(null);
      tokenStore.clear();
    } finally {
      setLoadingMe(false);
    }
  };

  useEffect(() => {
    const token = tokenStore.access;
    if (token) {
      const payload = decodeJwt(token);
      if (payload && payload.exp * 1000 > Date.now()) {
        setUserId(parseInt(payload.user_id, 10));
        loadMe();
      } else {
        tokenStore.clear();
      }
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await apiLogin(username, password);
    tokenStore.set(res.data.access, res.data.refresh);
    const payload = decodeJwt(res.data.access);
    if (payload) setUserId(parseInt(payload.user_id, 10));
    await loadMe();
  };

  const logout = () => {
    tokenStore.clear();
    setUserId(null);
    setMe(null);
    navigate("/");
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!userId,
        userId,
        me,
        loadingMe,
        login,
        logout,
        refreshMe: loadMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
