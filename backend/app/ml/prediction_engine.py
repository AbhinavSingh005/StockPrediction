import yfinance as yf
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from typing import Dict, Any, List

class PredictionEngine:
    @staticmethod
    def calculate_indicators(df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculates technical indicators for a given DataFrame of historical daily prices.
        """
        df = df.copy()
        close = df["Close"]
        high = df["High"]
        low = df["Low"]

        # Simple Moving Averages
        df["SMA_20"] = close.rolling(window=20).mean()
        df["SMA_50"] = close.rolling(window=50).mean()
        df["SMA_200"] = close.rolling(window=200).mean()

        # Exponential Moving Averages
        df["EMA_9"] = close.ewm(span=9, adjust=False).mean()
        df["EMA_21"] = close.ewm(span=21, adjust=False).mean()

        # Relative Strength Index (RSI)
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss.replace(0, 0.00001)
        df["RSI_14"] = 100 - (100 / (1 + rs))

        # MACD (Moving Average Convergence Divergence)
        ema_12 = close.ewm(span=12, adjust=False).mean()
        ema_26 = close.ewm(span=26, adjust=False).mean()
        df["MACD"] = ema_12 - ema_26
        df["MACD_Signal"] = df["MACD"].ewm(span=9, adjust=False).mean()
        df["MACD_Hist"] = df["MACD"] - df["MACD_Signal"]

        # Bollinger Bands
        df["BB_Middle"] = close.rolling(window=20).mean()
        bb_std = close.rolling(window=20).std()
        df["BB_Upper"] = df["BB_Middle"] + (bb_std * 2)
        df["BB_Lower"] = df["BB_Middle"] - (bb_std * 2)

        # Average True Range (ATR)
        high_low = high - low
        high_close_prev = (high - close.shift(1)).abs()
        low_close_prev = (low - close.shift(1)).abs()
        tr = pd.concat([high_low, high_close_prev, low_close_prev], axis=1).max(axis=1)
        df["ATR"] = tr.rolling(window=14).mean()

        return df

    @classmethod
    def get_predictions(cls, symbol: str) -> Dict[str, Any]:
        """
        Gathers historical data, trains ML models on-the-fly, and makes forecasts for 1d, 7d, and 30d out.
        """
        ticker = yf.Ticker(symbol)
        # Fetch 2 years of daily data
        df_raw = ticker.history(period="2y")
        if df_raw.empty or len(df_raw) < 125:
            # Fallback in case the ticker is new or yfinance failed
            df_raw = ticker.history(period="max")
            if df_raw.empty or len(df_raw) < 40:
                raise ValueError("Insufficient historical data to make AI predictions.")

        # Compute technical indicators
        df = cls.calculate_indicators(df_raw)
        df = df.dropna()

        if len(df) < 30:
            raise ValueError("Insufficient data remaining after computing technical indicators.")

        # Calculate daily log returns
        df["Return_1d"] = df["Close"].pct_change()
        df["Return_5d"] = df["Close"].pct_change(periods=5)
        df = df.dropna()

        # Construct features matrix (X)
        # We use relative metrics instead of absolute prices for stationary features
        features = pd.DataFrame(index=df.index)
        features["RSI_14"] = df["RSI_14"]
        features["MACD_Hist"] = df["MACD_Hist"]
        features["EMA_9_21_Ratio"] = df["EMA_9"] / df["EMA_21"]
        features["Price_SMA20_Ratio"] = df["Close"] / df["SMA_20"]
        features["Price_SMA50_Ratio"] = df["Close"] / df["SMA_50"]
        features["BB_Position"] = (df["Close"] - df["BB_Lower"]) / (df["BB_Upper"] - df["BB_Middle"]).replace(0, 0.0001)
        features["ATR_Pct"] = df["ATR"] / df["Close"]
        features["Return_1d_Lag"] = df["Return_1d"]
        features["Return_5d_Lag"] = df["Return_5d"]

        # Define targets
        # Note: target return is the future return we want to predict
        # e.g., Return of tomorrow relative to today
        df["Target_1d_Return"] = df["Close"].pct_change(periods=1).shift(-1)
        df["Target_7d_Return"] = df["Close"].pct_change(periods=7).shift(-7)
        df["Target_30d_Return"] = df["Close"].pct_change(periods=30).shift(-30)
        df["Target_Direction"] = (df["Target_1d_Return"] > 0).astype(int)

        # Prepare datasets
        # We hold out the last 30 rows since their targets are unknown (future prices)
        train_idx = df.index[:-30]
        
        X_train = features.loc[train_idx]
        y_train_direction = df.loc[train_idx, "Target_Direction"]
        y_train_1d = df.loc[train_idx, "Target_1d_Return"]
        y_train_7d = df.loc[train_idx, "Target_7d_Return"]
        y_train_30d = df.loc[train_idx, "Target_30d_Return"]

        # Drop any remaining NaNs in training targets
        valid_1d = y_train_1d.notna()
        valid_7d = y_train_7d.notna()
        valid_30d = y_train_30d.notna()

        # Build classification model (Direction prediction)
        clf = RandomForestClassifier(n_estimators=100, random_state=42)
        clf.fit(X_train[valid_1d], y_train_direction[valid_1d])

        # Build regressors for different horizons
        reg_1d = RandomForestRegressor(n_estimators=100, random_state=42)
        reg_1d.fit(X_train[valid_1d], y_train_1d[valid_1d])

        reg_7d = RandomForestRegressor(n_estimators=100, random_state=42)
        reg_7d.fit(X_train[valid_7d], y_train_7d[valid_7d])

        reg_30d = RandomForestRegressor(n_estimators=100, random_state=42)
        reg_30d.fit(X_train[valid_30d], y_train_30d[valid_30d])

        # Make prediction for the latest bar
        X_latest = features.iloc[[-1]]
        current_close = float(df["Close"].iloc[-1])
        current_atr = float(df["ATR"].iloc[-1])

        pred_direction = int(clf.predict(X_latest)[0])
        pred_proba = clf.predict_proba(X_latest)[0]
        confidence = float(pred_proba[pred_direction]) * 100

        pred_return_1d = float(reg_1d.predict(X_latest)[0])
        pred_return_7d = float(reg_7d.predict(X_latest)[0])
        pred_return_30d = float(reg_30d.predict(X_latest)[0])

        tomorrow_price = current_close * (1 + pred_return_1d)
        target_7d = current_close * (1 + pred_return_7d)
        target_30d = current_close * (1 + pred_return_30d)

        # Risk level evaluation based on annualized volatility
        daily_volatility = float(df["Return_1d"].std())
        annualized_volatility = daily_volatility * np.sqrt(252) * 100 # Volatility in %

        if annualized_volatility < 15:
            risk_level = "LOW"
        elif annualized_volatility < 32:
            risk_level = "MEDIUM"
        else:
            risk_level = "HIGH"

        # Generate recommendation
        expected_return_7d = pred_return_7d * 100
        
        if expected_return_7d > 1.5 and pred_direction == 1 and confidence > 53:
            action = "BUY"
        elif expected_return_7d < -1.5 and pred_direction == 0 and confidence > 53:
            action = "SELL"
        else:
            action = "HOLD"

        # Trading indicators for recommendation targets
        if action == "BUY":
            stop_loss = current_close - (1.5 * current_atr)
            take_profit = current_close + (3.0 * current_atr)
        elif action == "SELL":
            stop_loss = current_close + (1.5 * current_atr)
            take_profit = current_close - (3.0 * current_atr)
        else:
            # Default hold targets
            stop_loss = current_close - (2.0 * current_atr)
            take_profit = current_close + (4.0 * current_atr)

        # Explainable AI Text Construction
        explanation = []
        latest_rsi = float(df["RSI_14"].iloc[-1])
        latest_macd_hist = float(df["MACD_Hist"].iloc[-1])
        latest_ema_9 = float(df["EMA_9"].iloc[-1])
        latest_ema_21 = float(df["EMA_21"].iloc[-1])
        latest_bb_lower = float(df["BB_Lower"].iloc[-1])
        latest_bb_upper = float(df["BB_Upper"].iloc[-1])

        # RSI analysis
        if latest_rsi < 30:
            explanation.append(f"RSI is currently oversold ({latest_rsi:.1f}), which strongly hints at a bullish momentum reversal.")
        elif latest_rsi > 70:
            explanation.append(f"RSI is currently overbought ({latest_rsi:.1f}), signaling potential exhaustion and a downward correction.")
        else:
            explanation.append(f"RSI is in a neutral range ({latest_rsi:.1f}), indicating moderate buying or selling interest.")

        # MACD analysis
        if latest_macd_hist > 0:
            explanation.append("MACD is currently positive relative to the signal line, supporting a bullish momentum trend.")
        else:
            explanation.append("MACD histogram is negative, indicating bearish trend momentum.")

        # EMA crossover analysis
        if latest_ema_9 > latest_ema_21:
            explanation.append("Short-term EMA (9) is trading above the long-term EMA (21), validating a positive price trend.")
        else:
            explanation.append("Short-term EMA (9) is currently lower than EMA (21), indicating downward pressure.")

        # BB breakout check
        if current_close < latest_bb_lower:
            explanation.append("Price has breached the lower Bollinger Band, suggesting an oversold exhaustion bounce is probable.")
        elif current_close > latest_bb_upper:
            explanation.append("Price is trading above the upper Bollinger Band, indicating overextended price action.")

        # Confidence summary
        direction_text = "UP" if pred_direction == 1 else "DOWN"
        explanation.append(f"Our Random Forest classifier signals an {direction_text} movement with a confidence of {confidence:.1f}%.")

        return {
            "ticker": symbol.upper(),
            "current_price": round(current_close, 2),
            "direction": "UP" if pred_direction == 1 else "DOWN",
            "tomorrow_price": round(tomorrow_price, 2),
            "target_7d": round(target_7d, 2),
            "target_30d": round(target_30d, 2),
            "confidence": round(confidence, 1),
            "risk_level": risk_level,
            "expected_return": round(expected_return_7d, 2),
            "stop_loss": round(stop_loss, 2),
            "take_profit": round(take_profit, 2),
            "explanation": explanation,
            "technical_indicators": {
                "rsi": round(latest_rsi, 2),
                "macd": round(float(df["MACD"].iloc[-1]), 2),
                "macd_signal": round(float(df["MACD_Signal"].iloc[-1]), 2),
                "atr": round(current_atr, 2),
                "sma_20": round(float(df["SMA_20"].iloc[-1]), 2),
                "sma_50": round(float(df["SMA_50"].iloc[-1]), 2),
                "ema_9": round(latest_ema_9, 2),
                "ema_21": round(latest_ema_21, 2)
            }
        }
