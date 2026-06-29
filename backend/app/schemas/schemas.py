from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# --- AUTH SCHEMAS ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    balance: float
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[int] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)

class ResendOTPRequest(BaseModel):
    email: EmailStr


# --- STOCK & MARKET SCHEMAS ---
class StockSearchItem(BaseModel):
    symbol: str
    name: str
    sector: Optional[str] = None
    industry: Optional[str] = None

class StockQuote(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    change_percent: float
    high: float
    low: float
    open: float
    previous_close: float
    volume: int
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None


# --- TRADING & PORTFOLIO SCHEMAS ---
class TradeOrder(BaseModel):
    ticker: str
    shares: float = Field(..., gt=0)
    type: str = Field(..., pattern="^(BUY|SELL)$") # BUY or SELL
    stop_loss: Optional[float] = Field(None, description="Trigger price for stop loss")
    take_profit: Optional[float] = Field(None, description="Trigger price for take profit")

class UpdatePositionLimits(BaseModel):
    ticker: str
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

class PortfolioItemOut(BaseModel):
    id: int
    ticker: str
    shares: float
    average_buy_price: float
    current_price: float
    current_value: float
    cost_basis: float
    total_pl: float
    total_pl_percent: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

    class Config:
        from_attributes = True

class PortfolioSummaryOut(BaseModel):
    total_equity: float
    cash: float
    total_value: float
    total_pl: float
    total_pl_percent: float
    holdings: List[PortfolioItemOut]

class TransactionOut(BaseModel):
    id: int
    ticker: str
    type: str # BUY, SELL, STOP_LOSS_TRIGGER, TAKE_PROFIT_TRIGGER
    shares: float
    price: float
    total_amount: float
    timestamp: datetime

    class Config:
        from_attributes = True


# --- WATCHLIST SCHEMAS ---
class WatchlistAdd(BaseModel):
    ticker: str

class WatchlistOut(BaseModel):
    id: int
    ticker: str
    current_price: Optional[float] = None
    change_percent: Optional[float] = None

    class Config:
        from_attributes = True


# --- AI PREDICTION SCHEMAS ---
class PredictionResponse(BaseModel):
    ticker: str
    current_price: float
    direction: str # UP or DOWN
    tomorrow_price: float
    target_7d: float
    target_30d: float
    confidence: float
    risk_level: str # LOW, MEDIUM, HIGH
    expected_return: float
    stop_loss: float
    take_profit: float
    explanation: List[str]
    technical_indicators: dict

class OpportunityOut(BaseModel):
    ticker: str
    current_price: float
    expected_return: float
    direction: str
    confidence: float
    action: str # BUY, SELL, HOLD
    risk_level: str
