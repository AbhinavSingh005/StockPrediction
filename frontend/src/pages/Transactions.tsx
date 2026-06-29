import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTradingStore } from "../store/tradingStore";
import { History, Calendar, ChevronRight } from "lucide-react";


export default function Transactions() {
  const { transactions, fetchTransactions } = useTradingStore();

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const getTypeStyle = (type: string) => {
    if (type === "BUY") {
      return "bg-emerald-50 text-emerald-600 border border-emerald-100";
    }
    if (type === "SELL") {
      return "bg-slate-100 text-slate-700 border border-slate-200";
    }
    if (type.includes("STOP_LOSS")) {
      return "bg-rose-50 text-rose-600 border border-rose-100";
    }
    if (type.includes("TAKE_PROFIT")) {
      return "bg-blue-50 text-blue-600 border border-blue-100";
    }
    return "bg-slate-50 text-slate-500 border border-slate-100";
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-premium">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl">
            <History size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Transaction History</h1>
            <p className="text-slate-500 text-sm mt-1">Audit trail of all portfolio purchase orders, sales, and automated trigger liquidations.</p>
          </div>
        </div>
      </div>

      {/* Transactions list card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-premium overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base">Historical Logs</h3>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            You haven't executed any trades yet. Start virtual trading to log transaction records.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-3.5">Txn ID</th>
                  <th className="px-6 py-3.5">Execution Timestamp</th>
                  <th className="px-6 py-3.5">Ticker</th>
                  <th className="px-6 py-3.5">Transaction Type</th>
                  <th className="px-6 py-3.5">Quantity (Shares)</th>
                  <th className="px-6 py-3.5">Execution Price</th>
                  <th className="px-6 py-3.5 text-right">Total Net Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-50/50 transition-colors text-sm text-slate-700">
                    {/* ID */}
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      #TXN-{txn.id}
                    </td>
                    
                    {/* Timestamp */}
                    <td className="px-6 py-4 text-slate-500 flex items-center gap-2">
                      <Calendar size={14} className="text-slate-300" />
                      {formatDate(txn.timestamp)}
                    </td>

                    {/* Ticker */}
                    <td className="px-6 py-4">
                      <Link to={`/stock/${txn.ticker}`} className="font-bold text-slate-900 hover:text-emerald-600 transition-colors inline-flex items-center gap-1">
                        {txn.ticker} <ChevronRight size={12} className="text-slate-300" />
                      </Link>
                    </td>

                    {/* Type */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-bold ${getTypeStyle(txn.type)}`}>
                        {txn.type.replace(/_/g, " ")}
                      </span>
                    </td>

                    {/* Shares */}
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {txn.shares.toFixed(4)}
                    </td>

                    {/* Price */}
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      ${txn.price.toFixed(2)}
                    </td>

                    {/* Total Amount */}
                    <td className="px-6 py-4 font-extrabold text-slate-950 text-right">
                      ${txn.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
