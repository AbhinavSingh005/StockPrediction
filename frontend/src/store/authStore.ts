import { create } from "zustand";
import api from "../services/api";

interface User {
  id: number;
  email: string;
  full_name: string;
  balance: number;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, fullName: string) => Promise<boolean>;
  verifyOtp: (email: string, otpCode: string) => Promise<boolean>;
  resendOtp: (email: string) => Promise<boolean>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
  updateBalance: (newBalance: number) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem("stock_token"),
  isAuthenticated: !!localStorage.getItem("stock_token"),
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post("/auth/login", { email, password });
      const { access_token } = response.data;
      
      localStorage.setItem("stock_token", access_token);
      set({ token: access_token, isAuthenticated: true });
      
      await get().fetchProfile();
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.detail || "Invalid email or password",
        isLoading: false,
        isAuthenticated: false,
        token: null
      });
      localStorage.removeItem("stock_token");
      return false;
    }
  },

  register: async (email, password, fullName) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/auth/register", {
        email,
        password,
        full_name: fullName,
      });
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.detail || "Registration failed. Email might be in use.",
        isLoading: false,
      });
      return false;
    }
  },

  verifyOtp: async (email, otpCode) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post("/auth/verify-otp", { email, otp_code: otpCode });
      const { access_token } = response.data;
      
      localStorage.setItem("stock_token", access_token);
      set({ token: access_token, isAuthenticated: true });
      
      await get().fetchProfile();
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.detail || "Invalid or expired verification code",
        isLoading: false,
      });
      return false;
    }
  },

  resendOtp: async (email) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/auth/resend-otp", { email });
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.detail || "Failed to resend verification code",
        isLoading: false,
      });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem("stock_token");
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  fetchProfile: async () => {
    if (!localStorage.getItem("stock_token")) return;
    set({ isLoading: true });
    try {
      const response = await api.get("/auth/profile");
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      localStorage.removeItem("stock_token");
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: "Session expired, please login again"
      });
    }
  },

  updateBalance: (newBalance) => {
    const currentUser = get().user;
    if (currentUser) {
      set({ user: { ...currentUser, balance: newBalance } });
    }
  }
}));
