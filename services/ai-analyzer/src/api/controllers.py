# src/api/controllers.py
from fastapi import HTTPException
import logging
from typing import Dict, Any

from services.analyzer import analyzer_service

logger = logging.getLogger("ai-analyzer.controllers")

async def analyze_correlation(correlation_id: str) -> Dict[str, Any]:
    """
    Analyze a correlation by ID and return insights
    """
    logger.info(f"Analyzing correlation: {correlation_id}")
    
    result = await analyzer_service.analyze_correlation(correlation_id)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

async def analyze_incident(incident_id: str) -> Dict[str, Any]:
    """
    Analyze an incident by getting its correlations and analyzing them
    """
    # This would get correlations for the incident and analyze them
    # For the prototype, we'll just return a placeholder
    return {
        "message": "Incident analysis not implemented yet",
        "incident_id": incident_id
    }