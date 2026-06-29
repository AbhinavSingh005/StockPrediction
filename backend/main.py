import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database.session import engine, Base
from app.api import auth, stock, trading, prediction
from app.services.scheduler import start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize all database tables
    Base.metadata.create_all(bind=engine)
    # Start background scheduler for checking Stop Loss / Take Profit positions
    start_scheduler()
    yield
    # Stop scheduler on shutdown
    stop_scheduler()

app = FastAPI(
    title="AI-Powered Stock Prediction & Trading API",
    description="Backend services for real-time stock quotes, AI forecasting models, and virtual trading simulation.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to specific frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Healthcheck root endpoint
@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": "AI-Powered Stock Prediction & Trading Platform API",
        "version": "1.0.0"
    }

# Mount sub-routers under /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(stock.router, prefix="/api")
app.include_router(trading.router, prefix="/api")
app.include_router(prediction.router, prefix="/api")

if __name__ == "__main__":
    # Start server
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
