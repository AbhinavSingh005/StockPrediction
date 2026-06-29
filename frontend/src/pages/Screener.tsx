import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMarketStore } from "../store/marketStore";
import { 
  Filter, Grid, Table, TrendingUp, TrendingDown, 
  ChevronRight 
} from "lucide-react";


export default function Screener() {
  const { 
    screenerStocks, heatmapData, fetchScreener, fetchHeatmap, isLoading 
  } = useMarketStore();

  // Filter local states
  const [sector, setSector] = useState<string>("");
  const [peRange, setPeRange] = useState<string>("");
  const [minChange, setMinChange] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("market_cap");

  useEffect(() => {
    // Initial fetch
    fetchHeatmap();
    handleApplyFilters();
  }, []);

  const handleApplyFilters = () => {
    let minPe: number | undefined = undefined;
    let maxPe: number | undefined = undefined;
    
    if (peRange === "low") {
      maxPe = 15;
    } else if (peRange === "mid") {
      minPe = 15;
      maxPe = 30;
    } else if (peRange === "high") {
      minPe = 30;
    }

    fetchScreener({
      sector: sector || undefined,
      min_pe: minPe,
      max_pe: maxPe,
      min_change: minChange ? parseFloat(minChange) : undefined,
      sort_by: sortBy
    });
  };

  const formatMarketCap = (val?: number) => {
    if (!val) return "N/A";
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-premium">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl">
            <Filter size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Market Screener & Heatmap</h1>
            <p className="text-slate-500 text-sm mt-1">Filter global equities across sectors, valuations, and performance indices in real time.</p>
          </div>
        </div>
      </div>

      {/* Heatmap summary */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-premium">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Grid className="text-slate-700" size={18} />
          <h3 className="font-bold text-slate-900 text-base">Sector Performance Heatmap</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {heatmapData.map((item) => (
            <div 
              key={item.sector}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all hover:shadow-sm ${
                item.change_percent >= 0
                  ? "bg-emerald-50/40 border-emerald-100/80 text-emerald-800"
                  : "bg-rose-50/40 border-rose-100/80 text-rose-800"
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">{item.sector}</span>
              <span className={`text-lg font-extrabold mt-2 block ${item.change_percent >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {item.change_percent >= 0 ? "+" : ""}{item.change_percent.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters configuration card */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-premium">
        <div className="flex flex-wrap items-end gap-4">
          {/* Sector */}
          <div className="flex-grow min-w-[150px]">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Sector</label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            >
              <option value="">All Sectors</option>
              <option value="Technology">Technology</option>
              <option value="Financials">Financials</option>
              <option value="Consumer Cyclical">Consumer Cyclical</option>
              <option value="Energy">Energy</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Communication Services">Communication Services</option>
            </select>
          </div>

          {/* PE Range */}
          <div className="flex-grow min-w-[150px]">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Valuation (P/E Ratio)</label>
            <select
              value={peRange}
              onChange={(e) => setPeRange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            >
              <option value="">Any Valuation</option>
              <option value="low">Value stocks (P/E &lt; 15)</option>
              <option value="mid">Growth stocks (P/E 15 - 30)</option>
              <option value="high">High Growth (P/E &gt; 30)</option>
            </select>
          </div>

          {/* Min price change */}
          <div className="flex-grow min-w-[150px]">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Price Change %</label>
            <select
              value={minChange}
              onChange={(e) => setMinChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            >
              <option value="">Any Change</option>
              <option value="0">Positive Change (&gt; 0%)</option>
              <option value="2">High gainers (&gt; 2%)</option>
              <option value="-2">Trend reversal (&lt; -2%)</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex-grow min-w-[150px]">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            >
              <option value="market_cap">Market Cap</option>
              <option value="price">Price</option>
              <option value="change_percent">Price Return %</option>
              <option value="pe_ratio">P/E Ratio</option>
            </select>
          </div>

          <button
            onClick={handleApplyFilters}
            disabled={isLoading}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors border border-slate-900 shadow-sm shrink-0"
          >
            {isLoading ? "Loading..." : "Filter"}
          </button>
        </div>
      </div>

      {/* Screened results table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-premium overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
          <Table className="text-slate-700" size={18} />
          <h3 className="font-bold text-slate-900 text-base">Equities Universe</h3>
        </div>

        {screenerStocks.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No stocks matched your screener parameters. Change the filters and click "Filter" to scan again.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-3.5">Symbol</th>
                  <th className="px-6 py-3.5">Company</th>
                  <th className="px-6 py-3.5">Sector</th>
                  <th className="px-6 py-3.5">Price</th>
                  <th className="px-6 py-3.5">Daily Return</th>
                  <th className="px-6 py-3.5">P/E Ratio</th>
                  <th className="px-6 py-3.5">Market Capitalization</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {screenerStocks.map((item) => (
                  <tr key={item.symbol} className="hover:bg-slate-50/50 transition-colors text-sm text-slate-700">
                    <td className="px-6 py-4">
                      <Link to={`/stock/${item.symbol}`} className="font-bold text-slate-900 hover:text-emerald-600 transition-colors flex items-center gap-1">
                        {item.symbol} <ChevronRight size={14} className="text-slate-300" />
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900 max-w-[200px] truncate">{item.name}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase">
                        {item.sector}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">${item.price.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center font-bold ${item.change_percent >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {item.change_percent >= 0 ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                        {item.change_percent >= 0 ? "+" : ""}{item.change_percent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">{item.pe_ratio ? item.pe_ratio.toFixed(2) : "N/A"}</td>
                    <td className="px-6 py-4 font-medium">{formatMarketCap(item.market_cap)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/stock/${item.symbol}`}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors border border-slate-900 shadow-sm"
                      >
                        Trade
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
