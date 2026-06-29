import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTradingStore, PortfolioItem } from "../store/tradingStore";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { 
  TrendingUp, TrendingDown, Edit2, Check, X, 
  AlertCircle, Briefcase, ChevronRight 
} from "lucide-react";

export default function Portfolio() {
  const { 
    portfolio, fetchPortfolio, updatePositionLimits, 
    error, clearError, isLoading 
  } = useTradingStore();

  // Limit editing state
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [editSl, setEditSl] = useState<string>("");
  const [editTp, setEditTp] = useState<string>("");

  useEffect(() => {
    fetchPortfolio();
    clearError();
  }, [fetchPortfolio, clearError]);

  const handleEditClick = (item: PortfolioItem) => {
    setEditingTicker(item.ticker);
    setEditSl(item.stop_loss !== null && item.stop_loss !== undefined ? String(item.stop_loss) : "");
    setEditTp(item.take_profit !== null && item.take_profit !== undefined ? String(item.take_profit) : "");
  };

  const handleSaveLimits = async (ticker: string) => {
    const slVal = editSl.trim() === "" ? null : parseFloat(editSl);
    const tpVal = editTp.trim() === "" ? null : parseFloat(editTp);

    if (slVal !== null && isNaN(slVal)) return;
    if (tpVal !== null && isNaN(tpVal)) return;

    const success = await updatePositionLimits(ticker, slVal, tpVal);
    if (success) {
      setEditingTicker(null);
    }
  };

  // Prepare data for PieChart
  const pieData = portfolio?.holdings.map((h) => ({
    name: h.ticker,
    value: h.current_value,
  })) || [];

  // Curated premium color palette for holdings allocation
  const COLORS = ["#0ea5e9", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#3b82f6", "#14b8a6"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-premium">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl">
            <Briefcase size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Virtual Portfolio</h1>
            <p className="text-slate-500 text-sm mt-1">Track asset distribution, current profit margins, and manage safety trigger boundaries.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start text-rose-700 text-sm gap-3">
          <AlertCircle className="shrink-0 mt-0.5" size={16} />
          <span>{error}</span>
          <button onClick={() => clearError()} className="ml-auto text-rose-500 hover:text-rose-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Grid: Assets allocation & totals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* allocation chart */}
        <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-2xl shadow-premium flex flex-col items-center justify-between min-h-[300px]">
          <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 w-full pb-3 text-center">Asset Allocation</h3>
          
          {pieData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs text-center py-10">
              No holdings yet.<br />Purchase stocks to visualize allocation.
            </div>
          ) : (
            <>
              <div className="w-full h-44 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, "Value"]}
                      contentStyle={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "12px", fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="w-full mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                    />
                    <span className="font-semibold text-slate-700">{entry.name}</span>
                    <span>({((entry.value / (portfolio?.total_equity || 1)) * 100).toFixed(1)}%)</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Portfolio Summary Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-premium flex flex-col justify-between">
          <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">Financial Performance</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Net Valuation</span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                ${portfolio?.total_value !== undefined ? portfolio.total_value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "100,000.00"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Available Cash</span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                ${portfolio?.cash !== undefined ? portfolio.cash.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "100,000.00"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Cost Basis</span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                ${(portfolio?.total_value !== undefined && portfolio?.cash !== undefined) ? (portfolio.total_value - portfolio.cash - (portfolio?.total_pl ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Return</span>
              <span className={`text-2xl font-extrabold mt-1 block ${(portfolio?.total_pl ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {(portfolio?.total_pl ?? 0) >= 0 ? "+" : ""}{portfolio?.total_pl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-600 text-xs flex items-center gap-3">
            <AlertCircle size={16} className="text-slate-400 shrink-0" />
            <span>Virtual Cash yields zero interest. Watch triggers closely to prevent liquidation events during heavy trend drops.</span>
          </div>
        </div>
      </div>

      {/* Holdings list */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-premium overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base">Active Investments</h3>
        </div>
        
        {portfolio?.holdings.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            You do not own any stocks yet. Search for tickers using the top bar to execute virtual trade orders.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-3.5">Asset</th>
                  <th className="px-6 py-3.5">Position</th>
                  <th className="px-6 py-3.5">Avg Buy Price</th>
                  <th className="px-6 py-3.5">Current Price</th>
                  <th className="px-6 py-3.5">Current Value</th>
                  <th className="px-6 py-3.5">Total Return</th>
                  <th className="px-6 py-3.5 min-w-[200px]">Stop Loss / Take Profit</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {portfolio?.holdings.map((item) => {
                  const isEditing = editingTicker === item.ticker;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors text-sm text-slate-700">
                      {/* Asset */}
                      <td className="px-6 py-4.5">
                        <Link to={`/stock/${item.ticker}`} className="font-bold text-slate-900 hover:text-emerald-600 transition-colors flex items-center gap-1">
                          {item.ticker} <ChevronRight size={14} className="text-slate-300" />
                        </Link>
                      </td>
                      
                      {/* Position */}
                      <td className="px-6 py-4.5">
                        <span className="font-semibold text-slate-900">{item.shares.toFixed(4)}</span> shares
                      </td>
                      
                      {/* Avg Buy */}
                      <td className="px-6 py-4.5 font-medium">${item.average_buy_price.toFixed(2)}</td>
                      
                      {/* Current Price */}
                      <td className="px-6 py-4.5 font-medium">${item.current_price.toFixed(2)}</td>
                      
                      {/* Current Value */}
                      <td className="px-6 py-4.5 font-bold text-slate-900">${item.current_value.toFixed(2)}</td>
                      
                      {/* Total Return */}
                      <td className="px-6 py-4.5">
                        <span className={`flex items-center font-semibold ${item.total_pl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {item.total_pl >= 0 ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                          {item.total_pl >= 0 ? "+" : ""}{item.total_pl.toFixed(2)} ({item.total_pl_percent.toFixed(2)}%)
                        </span>
                      </td>

                      {/* SL/TP Inputs / Display */}
                      <td className="px-6 py-4.5">
                        {isEditing ? (
                          <div className="flex items-center gap-2 max-w-[200px]">
                            <input
                              type="number"
                              placeholder="SL Limit"
                              value={editSl}
                              onChange={(e) => setEditSl(e.target.value)}
                              className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                            <input
                              type="number"
                              placeholder="TP Limit"
                              value={editTp}
                              onChange={(e) => setEditTp(e.target.value)}
                              className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </div>
                        ) : (
                          <div className="text-xs space-y-1">
                            <div>
                              <span className="text-slate-400">Stop Loss: </span>
                              <span className="font-semibold text-slate-700">
                                {item.stop_loss ? `$${item.stop_loss.toFixed(2)}` : "None"}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">Take Profit: </span>
                              <span className="font-semibold text-slate-700">
                                {item.take_profit ? `$${item.take_profit.toFixed(2)}` : "None"}
                              </span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4.5 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveLimits(item.ticker)}
                              disabled={isLoading}
                              className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-100"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => setEditingTicker(null)}
                              className="p-1 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditClick(item)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1 text-xs"
                            >
                              <Edit2 size={12} /> Trigger
                            </button>
                            <Link
                              to={`/stock/${item.ticker}`}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs transition-colors border border-slate-900 shadow-sm"
                            >
                              Trade
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
