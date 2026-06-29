import yfinance as yf
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.models import User, Portfolio, Transaction

def check_stop_loss_take_profit():
    """
    Scans all active portfolio positions and executes Stop Loss / Take Profit sales.
    Runs in a background thread.
    """
    db: Session = SessionLocal()
    try:
        # Fetch all positions that have a stop_loss or take_profit set
        positions = db.query(Portfolio).filter(
            (Portfolio.shares > 0) & 
            ((Portfolio.stop_loss.isnot(None)) | (Portfolio.take_profit.isnot(None)))
        ).all()

        if not positions:
            return

        # Group positions by ticker to fetch price once per ticker
        ticker_groups = {}
        for pos in positions:
            ticker_groups.setdefault(pos.ticker, []).append(pos)

        for ticker_symbol, pos_list in ticker_groups.items():
            try:
                # Fetch current market price
                ticker_obj = yf.Ticker(ticker_symbol)
                hist = ticker_obj.history(period="1d")
                if hist.empty:
                    continue
                current_price = float(hist["Close"].iloc[-1])

                for pos in pos_list:
                    trigger_type = None
                    
                    # Check Stop Loss trigger
                    if pos.stop_loss is not None and current_price <= pos.stop_loss:
                        trigger_type = "STOP_LOSS_TRIGGER"
                    # Check Take Profit trigger
                    elif pos.take_profit is not None and current_price >= pos.take_profit:
                        trigger_type = "TAKE_PROFIT_TRIGGER"

                    if trigger_type:
                        # Fetch the owner user
                        user = db.query(User).filter(User.id == pos.user_id).first()
                        if not user:
                            continue

                        # Calculate transaction amount
                        shares_to_sell = pos.shares
                        total_proceeds = shares_to_sell * current_price

                        # Execute Virtual Sale
                        user.balance += total_proceeds
                        
                        # Add Transaction Record
                        txn = Transaction(
                            user_id=pos.user_id,
                            ticker=pos.ticker,
                            type=trigger_type,
                            shares=shares_to_sell,
                            price=current_price,
                            total_amount=total_proceeds
                        )
                        db.add(txn)
                        
                        # Remove position from portfolio
                        db.delete(pos)
                        db.commit()
                        print(f"[SCHEDULER] Executed {trigger_type} for User {user.id} on {pos.ticker}: sold {shares_to_sell} shares at {current_price:.2f}")

            except Exception as inner_e:
                print(f"[SCHEDULER] Error processing ticker {ticker_symbol}: {inner_e}")
                db.rollback()

    except Exception as e:
        print(f"[SCHEDULER] Global scheduler error: {e}")
    finally:
        db.close()

# Global background scheduler instance
scheduler = BackgroundScheduler()

def start_scheduler():
    if not scheduler.running:
        # Check every 60 seconds
        scheduler.add_job(check_stop_loss_take_profit, "interval", seconds=60, id="sl_tp_check")
        scheduler.start()
        print("[SCHEDULER] Active Position Monitoring Scheduler started.")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        print("[SCHEDULER] Active Position Monitoring Scheduler stopped.")
