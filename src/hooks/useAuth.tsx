import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  // Return shape aligns with Login.tsx usage
  signIn: (
    email: string,
    password: string
  ) => Promise<{ data: any; error: any }>; // supabase types simplified
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ data: any; error: any }>;
  signInWithGoogle: () => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle auth callback from URL hash
    const handleAuthCallback = async () => {
      try {
        // This will automatically handle the session from URL hash
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
        }

        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Auth callback error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // Get initial session
    handleAuthCallback();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);
      setUser(session?.user ?? null);
      setLoading(false);

      // Profile creation now handled by database trigger automatically
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ data: any; error: any }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { data: null, error };
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ data: any; error: any }> => {
    setLoading(true);
    try {
      console.log("Attempting signup with:", { email, fullName });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName ?? email.split("@")[0],
            username: fullName ?? email.split("@")[0],
          },
        },
      });

      console.log("Signup response:", { data, error });

      if (error) {
        console.error("Signup error:", error);
        return { data: null, error };
      }
      return { data, error: null };
    } catch (error) {
      console.error("Signup catch error:", error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<{ data: any; error: any }> => {
    setLoading(true);
    try {
      // Use environment variable if available, otherwise use current origin
      const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
      const redirectTo = `${siteUrl}/dashboard`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });
      if (error) return { data: null, error };
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
