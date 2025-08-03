import React, { createContext, useContext, useEffect, useState } from "react";
import type {
  User,
  UserGroup,
  Tenant,
  AuthResponse,
} from "../../../shared/types/auth";
import { authAPI } from "../lib/api";

interface AuthContextType {
  user: User | null;
  userGroup: UserGroup | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userGroup, setUserGroup] = useState<UserGroup | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const login = async (email: string, password: string) => {
    try {
      const response: AuthResponse = await authAPI.login({ email, password });

      // Store tokens
      localStorage.setItem("accessToken", response.accessToken);
      localStorage.setItem("refreshToken", response.refreshToken);

      // Store user data
      setUser(response.user);
      setUserGroup(response.userGroup);
      setTenant(response.tenant);

      // Store user data in localStorage for persistence
      localStorage.setItem("user", JSON.stringify(response.user));
      localStorage.setItem("userGroup", JSON.stringify(response.userGroup));
      localStorage.setItem("tenant", JSON.stringify(response.tenant));
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      // Clear all stored data
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("userGroup");
      localStorage.removeItem("tenant");

      setUser(null);
      setUserGroup(null);
      setTenant(null);
    }
  };

  const refreshAuth = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response: AuthResponse = await authAPI.refresh({ refreshToken });

      // Update tokens
      localStorage.setItem("accessToken", response.accessToken);
      localStorage.setItem("refreshToken", response.refreshToken);

      // Update user data
      setUser(response.user);
      setUserGroup(response.userGroup);
      setTenant(response.tenant);

      // Update localStorage
      localStorage.setItem("user", JSON.stringify(response.user));
      localStorage.setItem("userGroup", JSON.stringify(response.userGroup));
      localStorage.setItem("tenant", JSON.stringify(response.tenant));
    } catch (error) {
      console.error("Token refresh failed:", error);
      await logout();
    }
  };

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        const storedUserGroup = localStorage.getItem("userGroup");
        const storedTenant = localStorage.getItem("tenant");
        const accessToken = localStorage.getItem("accessToken");

        if (storedUser && storedUserGroup && storedTenant && accessToken) {
          setUser(JSON.parse(storedUser));
          setUserGroup(JSON.parse(storedUserGroup));
          setTenant(JSON.parse(storedTenant));

          // Try to refresh the token to ensure it's still valid
          await refreshAuth();
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const value: AuthContextType = {
    user,
    userGroup,
    tenant,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
