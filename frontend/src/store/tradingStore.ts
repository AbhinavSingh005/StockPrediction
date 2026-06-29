import { create } from "zustand";
import api from "../services/api";
import { useAuthStore } from "./authStore";

export interface PortfolioItem {
  id: number;
  ticker: string;
  shares: number;
  average_buy_price: number;
  current_price: number;
  current_value: number;
  cost_basis: number;
  total_pl: number;
  total_pl_percent: number;
  stop_loss?: number | null;
  take_profit?: number | null;
}

export interface PortfolioSummary {
  total_equity: number;
  cash: number;
  total_value: number;
  total_pl: number;
  total_pl_percent: number;
  holdings: PortfolioItem[];
}

export interface Transaction {
  id: number;
  ticker: string;
  type: string; // BUY, SELL, STOP_LOSS_TRIGGER, TAKE_PROFIT_TRIGGER
  shares: number;
  price: number;
  total_amount: number;
  timestamp: string;
}

export interface WatchlistItem {
  id: number;
  ticker: string;
  current_price?: number | null;
  change_percent?: number | null;
}

interface TradingState {
  portfolio: PortfolioSummary | null;
  transactions: Transaction[];
  watchlist: WatchlistItem[];
  isLoading: boolean;
  error: string | null;
  fetchPortfolio: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  fetchWatchlist: () => Promise<void>;
  addToWatchlist: (ticker: string) => Promise<boolean>;
  removeFromWatchlist: (ticker: string) => Promise<boolean>;
  executeTrade: (
    ticker: string,
    shares: number,
    type: "BUY" | "SELL",
    stopLoss?: number | null,
    takeProfit?: number | null
  ) => Promise<boolean>;
  updatePositionLimits: (
    ticker: string,
    stopLoss: number | null,
    takeProfit: number | null
  ) => Promise<boolean>;
  clearError: () => void;
}

export const useTradingStore = create<TradingState>((set, get) => ({
  portfolio: null,
  transactions: [],
  watchlist: [],
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchPortfolio: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get("/trading/portfolio");
      set({ portfolio: response.data, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.detail || "Failed to load portfolio",
        isLoading: false,
      });
    }
  },

  fetchTransactions: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get("/trading/transactions");
      set({ transactions: response.data, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.detail || "Failed to load transaction history",
        isLoading: false,
      });
    }
  },

  fetchWatchlist: async () => {
    try {
      const response = await api.get("/trading/watchlist");
      set({ watchlist: response.data });
    } catch (err: any) {
      console.error("Failed to load watchlist", err);
    }
  },

  addToWatchlist: async (ticker) => {
    set({ error: null });
    try {
      await api.post("/trading/watchlist", { ticker });
      await get().fetchWatchlist();
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Failed to add to watchlist" });
      return false;
    }
  },

  removeFromWatchlist: async (ticker) => {
    set({ error: null });
    try {
      await api.delete(`/trading/watchlist/${ticker}`);
      await get().fetchWatchlist();
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Failed to remove from watchlist" });
      return false;
    }
  },

  executeTrade: async (ticker, shares, type, stopLoss = null, takeProfit = null) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/trading/trade", {
        ticker,
        shares,
        type,
        stop_loss: stopLoss,
        take_profit: takeProfit,
      });
      // Refresh portfolio, transactions, and user balance
      await get().fetchPortfolio();
      await get().fetchTransactions();
      
      const profileResponse = await api.get("/auth/profile");
      useAuthStore.getState().updateBalance(profileResponse.data.balance);
      
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.detail || "Execution failed. Check markets and balance.",
        isLoading: false,
      });
      return false;
    }
  },

  updatePositionLimits: async (ticker, stopLoss, takeProfit) => {
    set({ isLoading: true, error: null });
    try {
      await api.put("/trading/positions/limits", {
        ticker,
        stop_loss: stopLoss,
        take_profit: takeProfit,
      });
      // Refresh portfolio
      await get().fetchPortfolio();
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.detail || "Failed to update target levels",
        isLoading: false,
      });
      return false;
    }
  },
}));
