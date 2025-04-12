# src/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Server settings
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "3002"))
    debug_mode: bool = os.getenv("DEBUG_MODE", "False").lower() == "true"
    
    # Gemini API
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    
    # MongoDB
    mongodb_url: str = os.getenv("MONGODB_URL", "mongodb://mongo:27017/ai-analyzer")
    
    # Correlation Engine
    correlation_engine_url: str = os.getenv("CORRELATION_ENGINE_URL", "http://correlation-engine:3001")

settings = Settings()