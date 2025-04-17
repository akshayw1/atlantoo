# src/api/routes.py
from fastapi import APIRouter, HTTPException, Path, Body
from typing import Dict, Any

from api.controllers import analyze_correlation, analyze_incident, detect_anomaly,analyze_solutions

router = APIRouter()

@router.post("/analyze/correlation/{correlation_id}")
async def analyze_correlation_route(
    correlation_id: str = Path(..., description="The ID of the correlation to analyze")
) -> Dict[str, Any]:
    """
    Analyze a correlation by ID
    """
    return await analyze_correlation(correlation_id)

@router.post("/analyze/incidents/{incident_id}")
async def analyze_incident_route(
    incident_id: str = Path(..., description="The ID of the incident to analyze")
) -> Dict[str, Any]:
    """
    Analyze an incident by ID
    """
    
    print(f"Analyzing incident: {incident_id}")
    
    return await analyze_incident(incident_id)

@router.post("/analyze/solutions")
async def analyze_solutions_route(
    request_data: Dict[str, Any] = Body(..., description="The incident and correlation IDs for solution generation")
) -> Dict[str, Any]:
    """
    Generate solutions for an incident based on analysis
    """
    return await analyze_solutions(request_data)

@router.post("/detect/anomaly")
async def detect_anomaly_route(
    request_data: Dict[str, Any] = Body(..., description="Telemetry data for anomaly detection")
) -> Dict[str, Any]:
    """
    Detect anomalies in telemetry data
    """
    return await detect_anomaly(request_data)