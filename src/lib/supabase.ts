import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing VITE_SUPABASE_URL environment variable");
}

if (!supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_ANON_KEY environment variable");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: "citizen" | "government";
          department?: string;
          phone?: string;
          address?: string;
          avatar_url?: string;
          bio?: string;
          is_public: boolean;
          followers: string[];
          following: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: "citizen" | "government";
          department?: string;
          phone?: string;
          address?: string;
          avatar_url?: string;
          bio?: string;
          is_public?: boolean;
          followers?: string[];
          following?: string[];
        };
        Update: {
          email?: string;
          full_name?: string;
          role?: "citizen" | "government";
          department?: string;
          phone?: string;
          address?: string;
          avatar_url?: string;
          bio?: string;
          is_public?: boolean;
          followers?: string[];
          following?: string[];
        };
      };
      // Add other table types as needed
    };
  };
};
