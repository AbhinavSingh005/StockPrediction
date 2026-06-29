import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useTradingStore } from "../store/tradingStore";
import { useMarketStore } from "../store/marketStore";
import { 
  TrendingUp, TrendingDown, Landmark, Sparkles, 
  ArrowRight, Newspaper, Compass 
} from "lucide-react";


export default function Dashboard() {
  const { user } = useAuthStore();
  const { portfolio, watchlist, fetchPortfolio, fetchWatchlist } = useTradingStore();
  const { 
    fearGreed, marketNews, opportunities, 
    fetchFearGreed, fetchNews, fetchOpportunities 
  } = useMarketStore();

  useEffect(() => {
    fetchPortfolio();
    fetchWatchlist();
    fetchFearGreed();
    fetchNews();
    fetchOpportunities();
  }, [fetchPortfolio, fetchWatchlist, fetchFearGreed, fetchNews, fetchOpportunities]);

  // Formulate Fear & Greed Gauge Angle
  const fgValue = fearGreed?.value ?? 50;
  const rotationAngle = (fgValue / 100) * 180 - 90; // Map 0-100 index value to -90 to +90 degrees rotation

  // Determine Fear & Greed color
  const getFgColor = (classification: string) => {
    if (classification?.includes("EXTREME FEAR")) return "text-red-600";
    if (classification?.includes("FEAR")) return "text-orange-500";
    if (classification?.includes("NEUTRAL")) return "text-slate-500";
    if (classification?.includes("EXTREME GREED")) return "text-emerald-700";
    return "text-emerald-500";
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-premium">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.full_name}</h1>
          <p className="text-slate-500 text-sm mt-1">Here is a summary of your portfolio and today's AI-powered market forecasts.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/screener"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-colors border border-slate-900 shadow-sm flex items-center gap-2"
          >
            Screener <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Stats Summary Rows */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Net Asset Value */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-premium relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Portfolio Value</span>
            <div className="p-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-100">
              <Landmark size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-900">
              ${portfolio?.total_value !== undefined ? portfolio.total_value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "100,000.00"}
            </h3>
            <div className="flex items-center gap-1.5 mt-2">
              {(portfolio?.total_pl ?? 0) >= 0 ? (
                <>
                  <span className="flex items-center justify-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <TrendingUp size={12} className="mr-1" />
                    +{portfolio?.total_pl_percent.toFixed(2)}%
                  </span>
                  <span className="text-xs text-slate-500">
                    +${portfolio?.total_pl.toLocaleString(undefined, { minimumFractionDigits: 2 })} overall
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center justify-center text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                    <TrendingDown size={12} className="mr-1" />
                    {portfolio?.total_pl_percent.toFixed(2)}%
                  </span>
                  <span className="text-xs text-slate-500">
                    -${Math.abs(portfolio?.total_pl ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} overall
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Invested Equity */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-premium">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Securities Equity</span>
            <div className="p-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-100">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-900">
              ${portfolio?.total_equity !== undefined ? portfolio.total_equity.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}
            </h3>
            <p className="text-slate-500 text-xs mt-2.5">
              Held in {portfolio?.holdings.length ?? 0} active positions
            </p>
          </div>
        </div>

        {/* Cash Balance */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-premium">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Virtual Buying Power</span>
            <div className="p-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-100">
              <Landmark size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-900">
              ${user?.balance !== undefined ? user.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "100,000.00"}
            </h3>
            <p className="text-slate-500 text-xs mt-2.5">Available for market orders & margins</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column (AI Opps, News), Right Column (Fear/Greed, Watchlist) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Scan Results */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-premium overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="text-amber-500" size={18} />
                <h3 className="font-bold text-slate-900 text-base">Top AI Investment Insights</h3>
              </div>
              <Link to="/predictions" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                Explore Predictor <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {opportunities.slice(0, 4).map((opp) => (
                <div key={opp.ticker} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Link to={`/stock/${opp.ticker}`} className="font-bold text-slate-900 hover:text-emerald-600 transition-colors">
                      {opp.ticker}
                    </Link>
                    <span className="text-xs text-slate-500">${opp.current_price.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Forecast return</div>
                      <div className={`font-bold text-sm ${opp.expected_return >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {opp.expected_return >= 0 ? "+" : ""}{opp.expected_return.toFixed(2)}%
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        opp.action === "BUY" 
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                          : opp.action === "SELL"
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {opp.action}
                      </span>
                    </div>

                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider font-sans">Confidence</div>
                      <div className="text-sm font-semibold text-slate-900">{opp.confidence.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial News */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-premium overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
              <Newspaper className="text-slate-700" size={18} />
              <h3 className="font-bold text-slate-900 text-base">Latest Market Sentiment</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {marketNews.slice(0, 5).map((article, idx) => (
                <a 
                  key={idx}
                  href={article.link} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-slate-50 transition-colors group block"
                >
                  <div className="space-y-1">
                    <h4 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors text-sm leading-snug">
                      {article.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{article.publisher}</span>
                      <span>•</span>
                      <span>{article.date}</span>
                    </div>
                  </div>
                  
                  <span className={`shrink-0 self-start text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                    article.sentiment === "BULLISH"
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : article.sentiment === "BEARISH"
                      ? "bg-rose-50 text-rose-600 border-rose-100"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}>
                    {article.sentiment}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Span 1) */}
        <div className="space-y-6">
          {/* Fear & Greed Dial */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-premium flex flex-col items-center">
            <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 w-full pb-3 text-center">Fear & Greed Index</h3>
            
            {/* SVG Arc Gauge */}
            <div className="relative w-44 h-24 mt-6 overflow-hidden">
              <svg width="176" height="88" viewBox="0 0 176 88">
                {/* Arc Background */}
                <path 
                  d="M10,88 A78,78 0 0,1 166,88" 
                  fill="none" 
                  stroke="#e2e8f0" 
                  strokeWidth="12" 
                  strokeLinecap="round"
                />
                {/* Colored Arcs: Red to Orange to Green */}
                <path 
                  d="M10,88 A78,78 0 0,1 62,35" 
                  fill="none" 
                  stroke="#ef4444" 
                  strokeWidth="12"
                />
                <path 
                  d="M62,35 A78,78 0 0,1 114,35" 
                  fill="none" 
                  stroke="#f97316" 
                  strokeWidth="12"
                />
                <path 
                  d="M114,35 A78,78 0 0,1 166,88" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="12" 
                  strokeLinecap="round"
                />
              </svg>

              {/* Dial Pin */}
              <div 
                className="absolute bottom-0 left-1/2 w-1.5 h-16 bg-slate-800 rounded-full origin-bottom -translate-x-1/2 transition-transform duration-1000"
                style={{ transform: `translateX(-50%) rotate(${rotationAngle}deg)` }}
              >
                {/* Dial Pin Center Nut */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4.5 h-4.5 bg-slate-900 border-2 border-white rounded-full" />
              </div>
            </div>

            <div className="text-center mt-3">
              <span className="text-3xl font-extrabold text-slate-900">{fgValue}</span>
              <p className={`text-xs font-bold uppercase mt-1 tracking-wider ${getFgColor(fearGreed?.classification || "NEUTRAL")}`}>
                {fearGreed?.classification || "NEUTRAL"}
              </p>
            </div>

            {/* Components break down */}
            {fearGreed?.components && (
              <div className="w-full mt-6 space-y-2 border-t border-slate-100 pt-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Market Momentum</span>
                  <span className="font-semibold text-slate-700">{fearGreed.components.momentum_score.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Price Strength</span>
                  <span className="font-semibold text-slate-700">{fearGreed.components.strength_score.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Volatility (VIX inverse)</span>
                  <span className="font-semibold text-slate-700">{fearGreed.components.volatility_score.toFixed(0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Watchlist Sidebar */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-premium overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
              <Compass className="text-slate-700" size={18} />
              <h3 className="font-bold text-slate-900 text-base">Watchlist Summary</h3>
            </div>
            
            {watchlist.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Your watchlist is empty.<br />Use the search bar above to find and pin tickers.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {watchlist.map((item) => (
                  <Link 
                    key={item.id}
                    to={`/stock/${item.ticker}`}
                    className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{item.ticker}</div>
                    </div>
                    
                    <div className="text-right">
                      {item.current_price ? (
                        <>
                          <div className="text-sm font-semibold text-slate-900">${item.current_price.toFixed(2)}</div>
                          <span className={`inline-flex items-center text-[10px] font-bold ${
                            (item.change_percent ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                          }`}>
                            {(item.change_percent ?? 0) >= 0 ? "+" : ""}{item.change_percent?.toFixed(2)}%
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">Fetching...</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
