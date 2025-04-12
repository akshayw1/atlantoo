# src/api/routes.py
from fastapi import APIRouter, HTTPException, Path
from typing import Dict, Any

from api.controllers import analyze_correlation, analyze_incident

router = APIRouter()

@router.post("/analyze/correlation/{correlation_id}")
async def analyze_correlation_route(
    correlation_id: str = Path(..., description="The ID of the correlation to analyze")
) -> Dict[str, Any]:
    """
    Analyze a correlation by ID
    """
    return await analyze_correlation(correlation_id)

@router.post("/analyze/incident/{incident_id}")
async def analyze_incident_route(
    incident_id: str = Path(..., description="The ID of the incident to analyze")
) -> Dict[str, Any]:
    """
    Analyze an incident by ID
    """
    return await analyze_incident(incident_id)