import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useTradingStore } from "../store/tradingStore";
import api from "../services/api";
import { 
  TrendingUp, Home, Briefcase, Cpu, Search, 
  Filter, History, LogOut, Menu, X, Bell 
} from "lucide-react";


export default function Layout() {
  const { user, logout, fetchProfile } = useAuthStore();
  const { watchlist, fetchWatchlist } = useTradingStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProfile();
    fetchWatchlist();
  }, [fetchProfile, fetchWatchlist]);

  // Handle outside clicks to close search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Run stock search queries
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await api.get(`/stocks/search?q=${searchQuery}`);
        setSearchResults(response.data);
        setShowDropdown(true);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearchResultClick = (symbol: string) => {
    setSearchQuery("");
    setShowDropdown(false);
    navigate(`/stock/${symbol}`);
  };

  const navItems = [
    { to: "/", icon: Home, label: "Dashboard" },
    { to: "/portfolio", icon: Briefcase, label: "Portfolio" },
    { to: "/predictions", icon: Cpu, label: "AI Predictions" },
    { to: "/screener", icon: Filter, label: "Stock Screener" },
    { to: "/transactions", icon: History, label: "Trade History" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 sticky top-0 h-screen">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
            <TrendingUp size={18} />
          </div>
          <span className="font-extrabold text-slate-900 text-lg tracking-tight">StockAI</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold uppercase">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.full_name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          
          {/* Drawer Content */}
          <aside className="relative flex flex-col w-64 bg-white h-full border-r border-slate-200 animate-slide-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <TrendingUp size={18} />
                </div>
                <span className="font-extrabold text-slate-900 text-lg tracking-tight">StockAI</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-slate-500 hover:text-slate-900">
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`
                  }
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="p-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold uppercase">
                  {user?.full_name?.charAt(0) || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user?.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex items-center justify-between gap-4">
          <button 
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <Menu size={20} />
          </button>

          {/* Search bar */}
          <div ref={dropdownRef} className="relative max-w-md w-full flex-1">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search global stocks (e.g., AAPL, TSLA, BTC-USD)..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
              />
            </div>

            {/* Dropdown search results */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-premium overflow-hidden z-50 max-h-80 overflow-y-auto">
                <div className="px-4 py-2 bg-slate-50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Search Results
                </div>
                {searchResults.map((result) => (
                  <button
                    key={result.symbol}
                    onClick={() => handleSearchResultClick(result.symbol)}
                    className="w-full px-4 py-3 hover:bg-slate-50 flex items-center justify-between text-left transition-colors border-b border-slate-50 last:border-0"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{result.symbol}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[240px]">{result.name}</div>
                    </div>
                    {result.sector && (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase">
                        {result.sector}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            
            {showDropdown && searchResults.length === 0 && searchQuery.trim() !== "" && !searchLoading && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-premium p-4 text-center text-slate-500 text-sm z-50">
                No matching symbols found.
              </div>
            )}
          </div>

          {/* User Status / Virtual Cash Display */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Balance Badge */}
            <div className="hidden sm:flex flex-col items-end px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-right">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Virtual Balance</span>
              <span className="text-sm font-bold text-slate-900">
                ${user?.balance !== undefined ? user.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "100,000.00"}
              </span>
            </div>

            {/* Notification Bell */}
            <button className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
              <Bell size={18} />
              {watchlist.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>
        </header>

        {/* Nested Content Pages */}
        <main className="flex-grow p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
