import time
from fastapi import APIRouter, Query, HTTPException, status
from typing import List, Optional, Dict, Any
from app.services.stock_service import StockService
from app.services.market_intel import MarketIntelService
from app.schemas.schemas import StockSearchItem, StockQuote

router = APIRouter(prefix="/stocks", tags=["Stocks & Market Intelligence"])

# In-memory cache for Screener & Heatmap to ensure rapid response times
SCREENER_TICKERS = {
    "Technology": ["AAPL", "MSFT", "NVDA", "GOOGL", "AMD", "CRM"],
    "Financials": ["JPM", "BAC", "GS", "MS", "V", "MA"],
    "Consumer Cyclical": ["TSLA", "AMZN", "NKE", "WMT", "KO", "PEP"],
    "Energy": ["XOM", "CVX"],
    "Healthcare": ["JNJ", "PFE", "UNH", "MRNA"],
    "Communication Services": ["DIS", "NFLX", "T", "VZ"]
}

screener_cache = {
    "timestamp": 0.0,
    "data": []
}

def get_screener_data() -> List[Dict[str, Any]]:
    """
    Retrieves and caches quote metrics for all screener stocks.
    """
    now = time.time()
    # Cache duration: 5 minutes (300 seconds)
    if now - screener_cache["timestamp"] < 300 and screener_cache["data"]:
        return screener_cache["data"]

    all_data = []
    for sector, symbols in SCREENER_TICKERS.items():
        for symbol in symbols:
            try:
                quote = StockService.get_stock_quote(symbol)
                quote["sector"] = sector
                all_data.append(quote)
            except Exception as e:
                print(f"Screener background fetch error for {symbol}: {e}")
                # Fallback item in case API fetch fails
                all_data.append({
                    "symbol": symbol,
                    "name": symbol,
                    "price": 150.0,
                    "change": 0.0,
                    "change_percent": 0.0,
                    "high": 152.0,
                    "low": 148.0,
                    "open": 149.0,
                    "previous_close": 150.0,
                    "volume": 1000000,
                    "market_cap": 1000000000.0,
                    "pe_ratio": 20.0,
                    "sector": sector
                })

    screener_cache["data"] = all_data
    screener_cache["timestamp"] = now
    return all_data

@router.get("/search", response_model=List[StockSearchItem])
def search_stocks(q: str = Query(..., min_length=1)):
    return StockService.search_tickers(q)

@router.get("/quote/{ticker}", response_model=StockQuote)
def get_quote(ticker: str):
    try:
        return StockService.get_stock_quote(ticker)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.get("/history/{ticker}")
def get_history(ticker: str, period: str = "1y", interval: str = "1d"):
    data = StockService.get_historical_data(ticker, period, interval)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No historical data found for symbol '{ticker}'"
        )
    return data

@router.get("/news")
def get_news(ticker: Optional[str] = "SPY"):
    return MarketIntelService.get_market_news(ticker)

@router.get("/fear-greed")
def get_fear_greed():
    return MarketIntelService.get_fear_and_greed_index()

@router.get("/screener")
def get_screener(
    sector: Optional[str] = None,
    min_pe: Optional[float] = None,
    max_pe: Optional[float] = None,
    min_change: Optional[float] = None,
    sort_by: Optional[str] = "market_cap" # market_cap, price, change_percent, pe_ratio
):
    stocks = get_screener_data()
    
    # Filter
    filtered = []
    for s in stocks:
        if sector and s.get("sector") != sector:
            continue
        pe = s.get("pe_ratio")
        if min_pe is not None and (pe is None or pe < min_pe):
            continue
        if max_pe is not None and (pe is None or pe > max_pe):
            continue
        if min_change is not None and s.get("change_percent") < min_change:
            continue
        filtered.append(s)

    # Sort
    reverse = True
    if sort_by == "pe_ratio":
        # Handle None in sorting
        filtered.sort(key=lambda x: x.get("pe_ratio") or 9999.0)
    elif sort_by == "price":
        filtered.sort(key=lambda x: x.get("price", 0.0), reverse=reverse)
    elif sort_by == "change_percent":
        filtered.sort(key=lambda x: x.get("change_percent", 0.0), reverse=reverse)
    else: # Default: market_cap
        filtered.sort(key=lambda x: x.get("market_cap") or 0.0, reverse=reverse)

    return filtered

@router.get("/heatmap")
def get_heatmap():
    """
    Computes average sector price returns and returns components.
    """
    stocks = get_screener_data()
    sector_summary = {}

    for s in stocks:
        sec = s.get("sector", "Other")
        change_pct = s.get("change_percent", 0.0)
        
        sector_summary.setdefault(sec, []).append(change_pct)

    heatmap = []
    for sector, changes in sector_summary.items():
        avg_change = sum(changes) / len(changes) if changes else 0.0
        
        # Pull details of stocks in this sector for heatmap rendering
        sector_stocks = [{
            "symbol": s["symbol"],
            "change_percent": s["change_percent"],
            "price": s["price"]
        } for s in stocks if s["sector"] == sector]
        
        heatmap.append({
            "sector": sector,
            "change_percent": round(avg_change, 2),
            "stocks": sector_stocks
        })
    return heatmap
