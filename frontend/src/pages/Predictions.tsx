import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useMarketStore } from "../store/marketStore";
import { 
  Sparkles, Brain, Cpu, ShieldAlert, 
  ChevronRight, Activity 
} from "lucide-react";


export default function Predictions() {
  const { opportunities, fetchOpportunities } = useMarketStore();

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const getActionColor = (action: string) => {
    if (action === "BUY") return "bg-emerald-50 text-emerald-600 border border-emerald-100";
    if (action === "SELL") return "bg-rose-50 text-rose-600 border border-rose-100";
    return "bg-slate-100 text-slate-600 border border-slate-200";
  };

  const getRiskColor = (risk: string) => {
    if (risk === "LOW") return "text-emerald-600 font-semibold";
    if (risk === "MEDIUM") return "text-orange-500 font-semibold";
    return "text-rose-600 font-semibold";
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-premium">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl">
            <Cpu size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI Stock Predictions</h1>
            <p className="text-slate-500 text-sm mt-1">Lightweight Random Forest models training dynamically on historical market indicators.</p>
          </div>
        </div>
      </div>

      {/* Ranks list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Opportunities list */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-premium overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
            <Sparkles className="text-amber-500" size={18} />
            <h3 className="font-bold text-slate-900 text-base">Top Ranked Scans</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {opportunities.map((opp, idx) => (
              <div 
                key={opp.ticker} 
                className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-xs text-slate-400 shrink-0">
                    #{idx + 1}
                  </div>
                  <div>
                    <Link to={`/stock/${opp.ticker}`} className="font-bold text-slate-950 hover:text-emerald-600 transition-colors flex items-center gap-1">
                      {opp.ticker} <ChevronRight size={14} />
                    </Link>
                    <span className="text-xs text-slate-400">Current Price: ${opp.current_price.toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-right shrink-0">
                  {/* Action */}
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">AI Action</span>
                    <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-bold ${getActionColor(opp.action)}`}>
                      {opp.action}
                    </span>
                  </div>
                  
                  {/* Expected return */}
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">7d Expected</span>
                    <span className={`text-sm font-extrabold ${opp.expected_return >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {opp.expected_return >= 0 ? "+" : ""}{opp.expected_return.toFixed(2)}%
                    </span>
                  </div>

                  {/* Confidence */}
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Confidence</span>
                    <span className="text-sm font-semibold text-slate-900">{opp.confidence.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="text-right shrink-0 border-t border-slate-100 sm:border-0 pt-2 sm:pt-0 flex items-center justify-between sm:justify-end gap-4">
                  <div className="sm:text-right">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider sm:hidden block">Risk Profile</div>
                    <span className={`text-xs ${getRiskColor(opp.risk_level)}`}>
                      {opp.risk_level} RISK
                    </span>
                  </div>
                  <Link
                    to={`/stock/${opp.ticker}`}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors border border-slate-900 shadow-sm"
                  >
                    Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Explainers */}
        <div className="space-y-6">
          {/* Methodology Explainer */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-premium space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Brain className="text-slate-800" size={18} />
              <h3 className="font-bold text-slate-900 text-base">Prediction Model</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Our forecasting model trains local **Random Forest** algorithms dynamically for each ticker using 2 years of daily market bars.
            </p>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-slate-50 border border-slate-100 text-slate-700 mt-0.5 shrink-0">
                  <Activity size={14} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-xs">Technical Indicators</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">RSI, MACD momentum bars, Bollinger Bands range placement, Exponential & Simple Moving Average crossovers, and Average True Range volatility ratios.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-slate-50 border border-slate-100 text-slate-700 mt-0.5 shrink-0">
                  <Brain size={14} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-xs">Binary Classifiers</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Predicts whether tomorrow's close price will exceed today's close, outputting probability returns which establish confidence levels.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 rounded bg-slate-50 border border-slate-100 text-slate-700 mt-0.5 shrink-0">
                  <Cpu size={14} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-xs">Horizon Regressors</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Determines percentage yield projections for tomorrow, 7 days, and 30 days based on lag indicators, converting yields to absolute price targets.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Warning disclaimer */}
          <div className="bg-orange-50/50 border border-orange-100 p-6 rounded-2xl shadow-sm text-xs text-slate-600 flex items-start gap-3">
            <ShieldAlert className="text-orange-500 shrink-0 mt-0.5" size={16} />
            <div className="space-y-1">
              <h4 className="font-semibold text-slate-900">Virtual Simulation Disclosure</h4>
              <p className="leading-relaxed">This tool performs local mock data estimations for virtual testing only. Historical performance does not guarantee future market returns.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
