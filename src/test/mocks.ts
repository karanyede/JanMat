import { vi } from "vitest";

// Mock Supabase client
export const mockSupabase = {
  auth: {
    getSession: vi
      .fn()
      .mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi
        .fn()
        .mockResolvedValue({ data: { path: "test-path" }, error: null }),
      getPublicUrl: vi
        .fn()
        .mockReturnValue({
          data: { publicUrl: "https://example.com/image.jpg" },
        }),
    })),
  },
};

// Mock auth hook
export const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
  role: "citizen" as const,
  full_name: "Test User",
};

export const mockUseAuth = {
  user: mockUser,
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
};
