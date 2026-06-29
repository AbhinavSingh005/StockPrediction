import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useTradingStore } from "../store/tradingStore";
import api from "../services/api";
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, BarChart, Bar 
} from "recharts";
import { 
  TrendingUp, TrendingDown, Pin, PinOff, Sparkles, 
  AlertCircle, ArrowLeft, Landmark, RefreshCw 
} from "lucide-react";

export default function StockDetails() {
  const { ticker } = useParams<{ ticker: string }>();
  const symbol = (ticker || "AAPL").toUpperCase();

  const { 
    watchlist, addToWatchlist, removeFromWatchlist, 
    executeTrade, fetchPortfolio, fetchWatchlist, error: tradingError,
    clearError: clearTradingError, isLoading: tradingLoading 
  } = useTradingStore();

  // Component local states
  const [quote, setQuote] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any | null>(null);
  
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(true);
  
  const [period, setPeriod] = useState("1y");
  
  // Indicator overlays toggles
  const [showSma20, setShowSma20] = useState(false);
  const [showSma50, setShowSma50] = useState(false);
  const [showEma9, setShowEma9] = useState(false);
  const [showEma21, setShowEma21] = useState(false);
  const [showBb, setShowBb] = useState(false);

  // Trading card form states
  const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
  const [shares, setShares] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [tradeSuccess, setTradeSuccess] = useState("");

  const isPinned = useMemo(() => {
    return watchlist.some((w) => w.ticker === symbol);
  }, [watchlist, symbol]);

  useEffect(() => {
    clearTradingError();
    setTradeSuccess("");
    setShares("");
    setStopLoss("");
    setTakeProfit("");
    
    // Fetch quote
    const fetchQuoteData = async () => {
      setQuoteLoading(true);
      try {
        const res = await api.get(`/stocks/quote/${symbol}`);
        setQuote(res.data);
      } catch (err) {
        console.error("Failed to load quote", err);
      } finally {
        setQuoteLoading(false);
      }
    };

    // Fetch predictions
    const fetchForecastData = async () => {
      setForecastLoading(true);
      try {
        const res = await api.get(`/predictions/forecast/${symbol}`);
        setForecast(res.data);
      } catch (err) {
        console.error("Failed to load predictions", err);
      } finally {
        setForecastLoading(false);
      }
    };

    fetchQuoteData();
    fetchForecastData();
    fetchPortfolio();
    fetchWatchlist();
  }, [symbol, fetchPortfolio, fetchWatchlist, clearTradingError]);

  // Fetch history when period changes
  useEffect(() => {
    const fetchHistoryData = async () => {
      setChartLoading(true);
      try {
        const res = await api.get(`/stocks/history/${symbol}?period=${period}`);
        setHistory(res.data);
      } catch (err) {
        console.error("Failed to load chart history", err);
      } finally {
        setChartLoading(false);
      }
    };
    fetchHistoryData();
  }, [symbol, period]);

  // Client-side computation of indicators
  const chartData = useMemo(() => {
    if (history.length === 0) return [];
    
    const data = history.map((item) => ({ ...item }));
    const prices = data.map((d) => d.close);

    // 1. Calculate SMA 20
    for (let i = 0; i < data.length; i++) {
      if (i >= 19) {
        const sum = prices.slice(i - 19, i + 1).reduce((a, b) => a + b, 0);
        data[i].sma20 = sum / 20;
      }
    }

    // 2. Calculate SMA 50
    for (let i = 0; i < data.length; i++) {
      if (i >= 49) {
        const sum = prices.slice(i - 49, i + 1).reduce((a, b) => a + b, 0);
        data[i].sma50 = sum / 50;
      }
    }

    // 3. Calculate EMA 9
    const k9 = 2 / (9 + 1);
    let ema9Val = prices[0];
    data[0].ema9 = ema9Val;
    for (let i = 1; i < data.length; i++) {
      ema9Val = prices[i] * k9 + ema9Val * (1 - k9);
      data[i].ema9 = ema9Val;
    }

    // 4. Calculate EMA 21
    const k21 = 2 / (21 + 1);
    let ema21Val = prices[0];
    data[0].ema21 = ema21Val;
    for (let i = 1; i < data.length; i++) {
      ema21Val = prices[i] * k21 + ema21Val * (1 - k21);
      data[i].ema21 = ema21Val;
    }

    // 5. Calculate Bollinger Bands (20 Close, 2 StdDev)
    for (let i = 0; i < data.length; i++) {
      if (i >= 19) {
        const slice = prices.slice(i - 19, i + 1);
        const mean = data[i].sma20;
        const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 20;
        const stdDev = Math.sqrt(variance);
        data[i].bbUpper = mean + stdDev * 2;
        data[i].bbLower = mean - stdDev * 2;
      }
    }

    return data;
  }, [history]);

  const handleWatchlistToggle = async () => {
    if (isPinned) {
      await removeFromWatchlist(symbol);
    } else {
      await addToWatchlist(symbol);
    }
  };

  const handleTradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearTradingError();
    setTradeSuccess("");

    const shareCount = parseFloat(shares);
    if (isNaN(shareCount) || shareCount <= 0) return;

    const slVal = stopLoss.trim() === "" ? null : parseFloat(stopLoss);
    const tpVal = takeProfit.trim() === "" ? null : parseFloat(takeProfit);

    const success = await executeTrade(symbol, shareCount, tradeType, slVal, tpVal);
    if (success) {
      setTradeSuccess(`Successfully executed ${tradeType} order for ${shareCount} shares of ${symbol}!`);
      setShares("");
      setStopLoss("");
      setTakeProfit("");
      setTimeout(() => setTradeSuccess(""), 5000);
    }
  };

  const autofillTargets = () => {
    if (forecast) {
      setStopLoss(String(forecast.stop_loss));
      setTakeProfit(String(forecast.take_profit));
    }
  };

  const totalCost = (parseFloat(shares) || 0) * (quote?.price || 0);

  return (
    <div className="space-y-6">
      {/* Back button & title bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-semibold">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        
        {quote && (
          <button 
            onClick={handleWatchlistToggle}
            className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs font-semibold transition-colors ${
              isPinned
                ? "bg-slate-900 border-slate-900 text-white"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
            {isPinned ? "Unwatch Stock" : "Watch Stock"}
          </button>
        )}
      </div>

      {/* Quote summary card */}
      {quoteLoading ? (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl animate-pulse h-24" />
      ) : quote ? (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-premium flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-extrabold text-slate-950">{quote.symbol}</h2>
              <span className="text-sm font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 border border-slate-100 rounded-md">
                Equity
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1">{quote.name}</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-3xl font-extrabold text-slate-900">${quote.price.toFixed(2)}</span>
              <div className="flex items-center justify-end gap-1.5 mt-1.5">
                {quote.change >= 0 ? (
                  <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <TrendingUp size={12} className="mr-1" />
                    +${quote.change.toFixed(2)} (+{quote.change_percent.toFixed(2)}%)
                  </span>
                ) : (
                  <span className="flex items-center text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                    <TrendingDown size={12} className="mr-1" />
                    -${Math.abs(quote.change).toFixed(2)} ({quote.change_percent.toFixed(2)}%)
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-l border-slate-150 pl-6 text-xs text-slate-500 hidden sm:grid">
              <div>
                <span className="text-slate-400">Open: </span>
                <span className="font-semibold text-slate-700">${quote.open.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400">Previous Close: </span>
                <span className="font-semibold text-slate-700">${quote.previous_close.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400">Day High: </span>
                <span className="font-semibold text-slate-700">${quote.high.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400">Day Low: </span>
                <span className="font-semibold text-slate-700">${quote.low.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl text-rose-700 text-sm text-center">
          Failed to fetch stock quotes. Check internet and ticker symbol connectivity.
        </div>
      )}

      {/* Grid: Charts & Trading card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column chart pane */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-premium space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              {/* Overlay toggles */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                <span className="mr-1 border-r border-slate-200 pr-2">TECHNICAL OVERLAYS:</span>
                <button 
                  onClick={() => setShowSma20(!showSma20)}
                  className={`px-2 py-1 rounded border ${showSma20 ? "bg-sky-50 text-sky-600 border-sky-100" : "bg-white hover:bg-slate-50 border-slate-200"}`}
                >
                  SMA 20
                </button>
                <button 
                  onClick={() => setShowSma50(!showSma50)}
                  className={`px-2 py-1 rounded border ${showSma50 ? "bg-violet-50 text-violet-600 border-violet-100" : "bg-white hover:bg-slate-50 border-slate-200"}`}
                >
                  SMA 50
                </button>
                <button 
                  onClick={() => setShowEma9(!showEma9)}
                  className={`px-2 py-1 rounded border ${showEma9 ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-white hover:bg-slate-50 border-slate-200"}`}
                >
                  EMA 9
                </button>
                <button 
                  onClick={() => setShowEma21(!showEma21)}
                  className={`px-2 py-1 rounded border ${showEma21 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-white hover:bg-slate-50 border-slate-200"}`}
                >
                  EMA 21
                </button>
                <button 
                  onClick={() => setShowBb(!showBb)}
                  className={`px-2 py-1 rounded border ${showBb ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-white hover:bg-slate-50 border-slate-200"}`}
                >
                  Bollinger Bands
                </button>
              </div>

              {/* Intervals */}
              <div className="flex items-center gap-1 text-[11px] font-bold bg-slate-50 border border-slate-200 p-0.5 rounded-lg">
                {["1m", "3m", "6m", "1y"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-2.5 py-1 rounded-md uppercase transition-colors ${
                      period === p
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                        : "text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Price line + overlays chart */}
            <div className="w-full h-80 relative">
              {chartLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                  <RefreshCw className="animate-spin text-slate-400" size={24} />
                </div>
              ) : chartData.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">
                  Failed to render historical charts.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      domain={["auto", "auto"]} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip 
                      contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "11px" }}
                      labelClassName="font-semibold text-slate-900"
                    />
                    <Line type="monotone" dataKey="close" stroke="#0f172a" strokeWidth={2} dot={false} name="Price" />
                    
                    {/* overlays */}
                    {showSma20 && <Line type="monotone" dataKey="sma20" stroke="#0ea5e9" strokeWidth={1} dot={false} name="SMA 20" />}
                    {showSma50 && <Line type="monotone" dataKey="sma50" stroke="#8b5cf6" strokeWidth={1} dot={false} name="SMA 50" />}
                    {showEma9 && <Line type="monotone" dataKey="ema9" stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" dot={false} name="EMA 9" />}
                    {showEma21 && <Line type="monotone" dataKey="ema21" stroke="#10b981" strokeWidth={1} strokeDasharray="3 3" dot={false} name="EMA 21" />}
                    
                    {/* BB overlays */}
                    {showBb && <Line type="monotone" dataKey="bbUpper" stroke="#ef4444" strokeWidth={1} strokeDasharray="2 2" dot={false} name="BB Upper" />}
                    {showBb && <Line type="monotone" dataKey="bbLower" stroke="#ef4444" strokeWidth={1} strokeDasharray="2 2" dot={false} name="BB Lower" />}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Volume Chart overlay at bottom */}
            {!chartLoading && chartData.length > 0 && (
              <div className="w-full h-16 border-t border-slate-100 pt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="date" hide />
                    <Tooltip 
                      contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "11px" }}
                      formatter={(value: any) => [value.toLocaleString(), "Volume"]}
                    />
                    <Bar dataKey="volume" fill="#cbd5e1" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* AI Forecast card */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-premium space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sparkles className="text-amber-500" size={18} />
              <h3 className="font-bold text-slate-900 text-base">AI Forecasting & Explainer</h3>
            </div>

            {forecastLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-6 bg-slate-50 rounded w-1/3" />
                <div className="h-20 bg-slate-50 rounded" />
              </div>
            ) : forecast ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Score indicators */}
                <div className="md:col-span-1 border-r border-slate-100 pr-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">AI Trend</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      forecast.direction === "UP"
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        : "bg-rose-50 text-rose-600 border border-rose-100"
                    }`}>
                      {forecast.direction === "UP" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {forecast.direction}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Confidence Score</span>
                    <span className="text-3xl font-extrabold text-slate-950 mt-1 block">{forecast.confidence.toFixed(1)}%</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Risk Assessment</span>
                    <span className={`text-sm font-bold block mt-1 ${
                      forecast.risk_level === "LOW" ? "text-emerald-600" : forecast.risk_level === "MEDIUM" ? "text-orange-500" : "text-rose-600"
                    }`}>
                      {forecast.risk_level} VOLATILITY
                    </span>
                  </div>
                </div>

                {/* Targets */}
                <div className="md:col-span-2 space-y-4">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Projections & Yield Targets</span>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl">
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">Tomorrow</span>
                      <span className="text-base font-bold text-slate-900 mt-1 block">${forecast.tomorrow_price.toFixed(2)}</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl">
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">7 Days</span>
                      <span className="text-base font-bold text-slate-900 mt-1 block">${forecast.target_7d.toFixed(2)}</span>
                      <span className={`text-[10px] font-bold mt-1 block ${forecast.expected_return >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {forecast.expected_return >= 0 ? "+" : ""}{forecast.expected_return.toFixed(1)}%
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl">
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">30 Days</span>
                      <span className="text-base font-bold text-slate-900 mt-1 block">${forecast.target_30d.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Explainer Notes */}
                  <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-600 leading-relaxed">
                    <div className="font-semibold text-slate-800 text-[10px] uppercase tracking-wider mb-2">Technical Indicators Explainer</div>
                    {forecast.explanation.map((item: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold shrink-0 mt-0.5">•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-xs py-4 text-center">
                Could not compute prediction parameters.
              </div>
            )}
          </div>
        </div>

        {/* Right column trading panel */}
        <div className="space-y-6">
          {/* Virtual Terminal */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-premium">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Landmark className="text-slate-800" size={18} />
              <h3 className="font-bold text-slate-900 text-base">Virtual Terminal</h3>
            </div>

            {tradingError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start text-rose-700 text-xs gap-2">
                <AlertCircle className="shrink-0 mt-0.5" size={14} />
                <span>{tradingError}</span>
              </div>
            )}

            {tradeSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs">
                {tradeSuccess}
              </div>
            )}

            <form onSubmit={handleTradeSubmit} className="space-y-4">
              {/* BUY / SELL Switcher */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setTradeType("BUY")}
                  className={`py-2 rounded-lg transition-colors ${
                    tradeType === "BUY"
                      ? "bg-slate-900 text-white shadow-sm border border-slate-900"
                      : "text-slate-400 hover:text-slate-900"
                  }`}
                >
                  BUY ORDER
                </button>
                <button
                  type="button"
                  onClick={() => setTradeType("SELL")}
                  className={`py-2 rounded-lg transition-colors ${
                    tradeType === "SELL"
                      ? "bg-slate-900 text-white shadow-sm border border-slate-900"
                      : "text-slate-400 hover:text-slate-900"
                  }`}
                >
                  SELL ORDER
                </button>
              </div>

              {/* Share Count */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Shares to execute</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                />
              </div>

              {/* Stop Loss (SL) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stop Loss (Optional)</label>
                  {forecast && (
                    <button 
                      type="button"
                      onClick={autofillTargets}
                      className="text-[9px] text-emerald-600 hover:text-emerald-700 font-semibold"
                    >
                      Fill AI suggestions
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="Trigger Price Limit"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                />
              </div>

              {/* Take Profit (TP) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Take Profit (Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  placeholder="Trigger Price Limit"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                />
              </div>

              {/* Calculation review */}
              <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Security Price</span>
                  <span className="font-semibold text-slate-700">${quote?.price ? quote.price.toFixed(2) : "0.00"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Net Amount</span>
                  <span className="font-bold text-slate-900">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={tradingLoading || quoteLoading}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors border border-slate-900 shadow-sm"
              >
                {tradingLoading ? "Executing order..." : `Place ${tradeType} Order`}
              </button>
            </form>
          </div>

          {/* AI Suggestions Card for fast viewing */}
          {forecast && (
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-premium space-y-3.5 text-xs">
              <div className="font-bold text-slate-900 border-b border-slate-100 pb-2">AI Suggested Parameters</div>
              
              <div className="flex justify-between">
                <span className="text-slate-400">Suggested Action</span>
                <span className={`font-semibold uppercase ${
                  forecast.expected_return > 1.5 ? "text-emerald-600 font-bold" : forecast.expected_return < -1.5 ? "text-rose-600 font-bold" : "text-slate-500"
                }`}>
                  {forecast.expected_return > 1.5 ? "BUY HOLDING" : forecast.expected_return < -1.5 ? "SHORT / LIQUIDATE" : "HOLD POSITION"}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-400">Stop Loss Limit</span>
                <span className="font-bold text-slate-800">${forecast.stop_loss.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Take Profit Limit</span>
                <span className="font-bold text-slate-800">${forecast.take_profit.toFixed(2)}</span>
              </div>

              <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg text-[10px] text-slate-500 leading-relaxed">
                Clicking **"Fill AI suggestions"** in the terminal form above auto-populates the SL and TP limits calculated by the ATR volatility ranges.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
