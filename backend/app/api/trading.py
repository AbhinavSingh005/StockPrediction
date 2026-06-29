from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.models import User, Portfolio, Watchlist, Transaction
from app.schemas.schemas import (
    TradeOrder, PortfolioSummaryOut, PortfolioItemOut,
    TransactionOut, WatchlistAdd, WatchlistOut, UpdatePositionLimits
)
from app.core.security import get_current_user
from app.services.stock_service import StockService
import yfinance as yf

router = APIRouter(prefix="/trading", tags=["Virtual Trading & Portfolio"])

# --- WATCHLIST ENDPOINTS ---
@router.get("/watchlist", response_model=List[WatchlistOut])
def get_watchlist(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(Watchlist).filter(Watchlist.user_id == current_user.id).all()
    results = []
    for item in items:
        # Fetch current price and change percent for watchlisted stocks
        try:
            quote = StockService.get_stock_quote(item.ticker)
            price = quote["price"]
            change = quote["change_percent"]
        except Exception:
            price = None
            change = None
        results.append(WatchlistOut(
            id=item.id,
            ticker=item.ticker,
            current_price=price,
            change_percent=change
        ))
    return results

@router.post("/watchlist", response_model=WatchlistOut)
def add_to_watchlist(
    payload: WatchlistAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticker_symbol = payload.ticker.upper().strip()
    
    # Check if already watchlisted
    existing = db.query(Watchlist).filter(
        Watchlist.user_id == current_user.id,
        Watchlist.ticker == ticker_symbol
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stock is already in your watchlist"
        )
    
    # Verify symbol validity
    try:
        StockService.get_stock_quote(ticker_symbol)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ticker symbol: {str(e)}"
        )

    new_item = Watchlist(user_id=current_user.id, ticker=ticker_symbol)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    return WatchlistOut(id=new_item.id, ticker=new_item.ticker)

@router.delete("/watchlist/{ticker}")
def remove_from_watchlist(
    ticker: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticker_symbol = ticker.upper().strip()
    item = db.query(Watchlist).filter(
        Watchlist.user_id == current_user.id,
        Watchlist.ticker == ticker_symbol
    ).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stock not found in your watchlist"
        )
    db.delete(item)
    db.commit()
    return {"message": f"Successfully removed {ticker_symbol} from watchlist"}


# --- TRADING ENDPOINTS ---
@router.post("/trade", response_model=TransactionOut)
def execute_trade(
    order: TradeOrder,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticker_symbol = order.ticker.upper().strip()
    
    # Get current stock price
    try:
        quote = StockService.get_stock_quote(ticker_symbol)
        current_price = quote["price"]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not retrieve stock price: {str(e)}"
        )

    total_cost = order.shares * current_price

    if order.type == "BUY":
        # Check cash balance
        if current_user.balance < total_cost:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient balance. Required: ${total_cost:,.2f}, Available: ${current_user.balance:,.2f}"
            )
        
        # Deduct balance
        current_user.balance -= total_cost
        
        # Update or create portfolio position
        position = db.query(Portfolio).filter(
            Portfolio.user_id == current_user.id,
            Portfolio.ticker == ticker_symbol
        ).first()

        if position:
            # Cost-average calculation
            total_shares = position.shares + order.shares
            total_basis = (position.shares * position.average_buy_price) + total_cost
            position.average_buy_price = total_basis / total_shares
            position.shares = total_shares
            
            # Update SL/TP only if provided in order
            if order.stop_loss is not None:
                position.stop_loss = order.stop_loss
            if order.take_profit is not None:
                position.take_profit = order.take_profit
        else:
            position = Portfolio(
                user_id=current_user.id,
                ticker=ticker_symbol,
                shares=order.shares,
                average_buy_price=current_price,
                stop_loss=order.stop_loss,
                take_profit=order.take_profit
            )
            db.add(position)

    elif order.type == "SELL":
        # Check if position exists
        position = db.query(Portfolio).filter(
            Portfolio.user_id == current_user.id,
            Portfolio.ticker == ticker_symbol
        ).first()

        if not position or position.shares < order.shares:
            available_shares = position.shares if position else 0.0
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient shares. Selling: {order.shares}, Available: {available_shares}"
            )
        
        # Add proceeds to balance
        current_user.balance += total_cost
        
        # Deduct shares from portfolio
        position.shares -= order.shares
        if position.shares <= 0.00001:
            db.delete(position)

    # Log Transaction
    txn = Transaction(
        user_id=current_user.id,
        ticker=ticker_symbol,
        type=order.type,
        shares=order.shares,
        price=current_price,
        total_amount=total_cost
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)

    return txn

@router.put("/positions/limits", response_model=PortfolioItemOut)
def update_position_limits(
    limits: UpdatePositionLimits,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticker_symbol = limits.ticker.upper().strip()
    position = db.query(Portfolio).filter(
        Portfolio.user_id == current_user.id,
        Portfolio.ticker == ticker_symbol
    ).first()

    if not position:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active holding found for symbol '{ticker_symbol}'"
        )
    
    # Update SL/TP levels (they can be set to null/None)
    position.stop_loss = limits.stop_loss
    position.take_profit = limits.take_profit
    db.commit()
    db.refresh(position)

    # Get quote for returning fully detailed position
    try:
        quote = StockService.get_stock_quote(ticker_symbol)
        current_price = quote["price"]
    except Exception:
        current_price = position.average_buy_price

    cost_basis = position.shares * position.average_buy_price
    current_value = position.shares * current_price
    total_pl = current_value - cost_basis
    total_pl_percent = (total_pl / cost_basis * 100) if cost_basis > 0 else 0.0

    return PortfolioItemOut(
        id=position.id,
        ticker=position.ticker,
        shares=position.shares,
        average_buy_price=position.average_buy_price,
        current_price=current_price,
        current_value=current_value,
        cost_basis=cost_basis,
        total_pl=total_pl,
        total_pl_percent=total_pl_percent,
        stop_loss=position.stop_loss,
        take_profit=position.take_profit
    )

@router.get("/portfolio", response_model=PortfolioSummaryOut)
def get_portfolio_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    positions = db.query(Portfolio).filter(Portfolio.user_id == current_user.id).all()
    holdings_out = []
    total_holdings_value = 0.0
    total_cost_basis = 0.0

    for pos in positions:
        try:
            quote = StockService.get_stock_quote(pos.ticker)
            current_price = quote["price"]
        except Exception:
            current_price = pos.average_buy_price
        
        cost_basis = pos.shares * pos.average_buy_price
        current_value = pos.shares * current_price
        total_pl = current_value - cost_basis
        total_pl_percent = (total_pl / cost_basis * 100) if cost_basis > 0 else 0.0

        total_holdings_value += current_value
        total_cost_basis += cost_basis

        holdings_out.append(PortfolioItemOut(
            id=pos.id,
            ticker=pos.ticker,
            shares=pos.shares,
            average_buy_price=pos.average_buy_price,
            current_price=current_price,
            current_value=current_value,
            cost_basis=cost_basis,
            total_pl=total_pl,
            total_pl_percent=total_pl_percent,
            stop_loss=pos.stop_loss,
            take_profit=pos.take_profit
        ))

    total_value = total_holdings_value + current_user.balance
    total_overall_pl = total_holdings_value - total_cost_basis
    total_overall_pl_percent = (total_overall_pl / total_cost_basis * 100) if total_cost_basis > 0 else 0.0

    return PortfolioSummaryOut(
        total_equity=round(total_holdings_value, 2),
        cash=round(current_user.balance, 2),
        total_value=round(total_value, 2),
        total_pl=round(total_overall_pl, 2),
        total_pl_percent=round(total_overall_pl_percent, 2),
        holdings=holdings_out
    )

@router.get("/transactions", response_model=List[TransactionOut])
def get_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    txns = db.query(Transaction).filter(
        Transaction.user_id == current_user.id
    ).order_by(Transaction.timestamp.desc()).all()
    return txns
