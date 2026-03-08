"""
HappyTransport Logistics API - Simplified version
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import router, legacy_router

# Create FastAPI app
app = FastAPI(
    title="HappyTransport Logistics API",
    description="Freight loads and booking metrics API for logistics operations.",
    version="1.0.0",
)

# Setup CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://happytransport-logistics.web.app",
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router)
app.include_router(legacy_router)


# Startup event with helpful messages
@app.on_event("startup")
async def startup_message():
    """Print startup information."""
    import sys

    port = os.getenv("PORT", "8000")
    print("\n" + "=" * 70, file=sys.stderr)
    print("🚚 HappyTransport Logistics API started!", file=sys.stderr)
    print("=" * 70, file=sys.stderr)
    print("📊 Dashboard:     http://localhost:5173", file=sys.stderr)
    print(f"📡 API Docs:      http://localhost:{port}/docs", file=sys.stderr)
    print(f"📋 ReDoc:         http://localhost:{port}/redoc", file=sys.stderr)
    print("🔑 API Key:       X-API-Key: secret-dev", file=sys.stderr)
    print("=" * 70 + "\n", file=sys.stderr)


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "HappyTransport Logistics API",
        "version": "1.0.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
    )
