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
    Generate solutions for an incident based on analysis
    """
    # incident_id = request_data.get("incidentId")
    
    # if not incident_id:
    #     raise HTTPException(status_code=400, detail="Missing required field: incidentId")
    
    logger.info(f"Analyzing incident: {incident_id}")
    
    result = await analyzer_service.analyze_incident(incident_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    logger.info(f"Incident analysis result: {result}")
    
    return result


async def trigger_auto_fix(incident_id: str) -> Dict[str, Any]:
    """
    Trigger an auto-fix for an incident based on analysis
    """
    logger.info(f"Triggering PR initial: {incident_id}")
    
    result = await analyzer_service._trigger_github_fix(incident_id)
    
    # Check if result is None
    if result is None:
        logger.warning(f"Received None result from _trigger_github_fix for incident {incident_id}")
        return {"status": "error", "message": "Auto-fix process returned no result"}
    
    # Then check for errors
    if isinstance(result, dict) and "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    logger.info(f"Trigger analysis done and PR created")
    
    return result



async def analyze_solutions(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate solutions for an incident based on analysis
    """
    incident_id = request_data.get("incidentId")
    correlation_id = request_data.get("correlationId")
    
    if not incident_id:
        raise HTTPException(status_code=400, detail="Missing required field: incidentId")
    
    logger.info(f"Generating solutions for incident: {incident_id}, correlation: {correlation_id}")
    
    result = await analyzer_service.generate_incident_solutions(incident_id, correlation_id)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

async def detect_anomaly(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Detect anomalies in provided telemetry data
    """
    logger.info(f"Detecting anomalies for service: {request_data.get('serviceName')}")
    
    result = await analyzer_service.detect_anomaly(request_data)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result