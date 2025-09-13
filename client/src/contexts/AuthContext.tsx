import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { type PublicUser } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: PublicUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, confirmPassword: string, major: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to get current user
  const {
    data: userData,
    isLoading,
    refetch: refetchUser,
    error,
  } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/auth/me');
      return await response.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const user = userData?.user || null;
  const isAuthenticated = !!user;

  // Handle authentication errors
  useEffect(() => {
    if (error && (error as any)?.status === 401) {
      // Clear any cached data on auth error
      queryClient.clear();
    }
  }, [error, queryClient]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await apiRequest('POST', '/api/auth/login', { username, password });
      return await response.json();
    },
    onSuccess: (data) => {
      // Refetch user data and invalidate all queries
      refetchUser();
      queryClient.invalidateQueries();
      toast({
        title: "Welcome back!",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again",
        variant: "destructive",
      });
      throw error;
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async ({ username, password, confirmPassword, major, fullName }: { username: string; password: string; confirmPassword: string; major: string; fullName?: string }) => {
      const registerData = { username, password, confirmPassword, major, ...(fullName && { fullName }) };
      const response = await apiRequest('POST', '/api/auth/register', registerData);
      return await response.json();
    },
    onSuccess: (data) => {
      // Refetch user data and invalidate all queries
      refetchUser();
      queryClient.invalidateQueries();
      toast({
        title: "Account created successfully!",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please check your information and try again",
        variant: "destructive",
      });
      throw error;
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/logout');
      return await response.json();
    },
    onSuccess: () => {
      // Clear all cached data and redirect
      queryClient.clear();
      setLocation('/login');
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Logout failed",
        description: error.message || "Failed to logout properly",
        variant: "destructive",
      });
    },
  });

  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };

  const register = async (username: string, password: string, confirmPassword: string, major: string, fullName?: string) => {
    await registerMutation.mutateAsync({ username, password, confirmPassword, major, fullName });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refetchUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};