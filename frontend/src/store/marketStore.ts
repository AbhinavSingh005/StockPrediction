import { create } from "zustand";
import api from "../services/api";

export interface ScreenerStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  market_cap?: number;
  pe_ratio?: number;
  sector: string;
}

export interface HeatmapStock {
  symbol: string;
  change_percent: number;
  price: number;
}

export interface HeatmapItem {
  sector: string;
  change_percent: number;
  stocks: HeatmapStock[];
}

export interface FearGreedComponents {
  momentum_score: number;
  strength_score: number;
  volatility_score: number;
}

export interface FearGreedData {
  value: number;
  classification: string;
  components: FearGreedComponents;
}

export interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  date: string;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  score: number;
}

export interface Opportunity {
  ticker: string;
  current_price: number;
  expected_return: number;
  direction: "UP" | "DOWN";
  confidence: number;
  action: "BUY" | "SELL" | "HOLD";
  risk_level: "LOW" | "MEDIUM" | "HIGH";
}

interface MarketState {
  screenerStocks: ScreenerStock[];
  heatmapData: HeatmapItem[];
  fearGreed: FearGreedData | null;
  marketNews: NewsItem[];
  opportunities: Opportunity[];
  isLoading: boolean;
  fetchScreener: (filters?: {
    sector?: string;
    min_pe?: number;
    max_pe?: number;
    min_change?: number;
    sort_by?: string;
  }) => Promise<void>;
  fetchHeatmap: () => Promise<void>;
  fetchFearGreed: () => Promise<void>;
  fetchNews: (ticker?: string) => Promise<void>;
  fetchOpportunities: () => Promise<void>;
}

export const useMarketStore = create<MarketState>((set) => ({
  screenerStocks: [],
  heatmapData: [],
  fearGreed: null,
  marketNews: [],
  opportunities: [],
  isLoading: false,

  fetchScreener: async (filters) => {
    set({ isLoading: true });
    try {
      const response = await api.get("/stocks/screener", { params: filters });
      set({ screenerStocks: response.data, isLoading: false });
    } catch (err) {
      console.error("Failed to fetch screener data", err);
      set({ isLoading: false });
    }
  },

  fetchHeatmap: async () => {
    try {
      const response = await api.get("/stocks/heatmap");
      set({ heatmapData: response.data });
    } catch (err) {
      console.error("Failed to fetch heatmap data", err);
    }
  },

  fetchFearGreed: async () => {
    try {
      const response = await api.get("/stocks/fear-greed");
      set({ fearGreed: response.data });
    } catch (err) {
      console.error("Failed to fetch Fear & Greed index", err);
    }
  },

  fetchNews: async (ticker = "SPY") => {
    try {
      const response = await api.get("/stocks/news", { params: { ticker } });
      set({ marketNews: response.data });
    } catch (err) {
      console.error("Failed to fetch news", err);
    }
  },

  fetchOpportunities: async () => {
    try {
      const response = await api.get("/predictions/opportunities");
      set({ opportunities: response.data });
    } catch (err) {
      console.error("Failed to fetch AI opportunities", err);
    }
  }
}));
