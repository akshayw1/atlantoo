# src/api/routes.py
from fastapi import APIRouter, HTTPException, Path, Body
from typing import Dict, Any
import logging
from services.analyzer import analyzer_service
from services.gemini_client import gemini_client
from services.prompt_builder import prompt_builder

from db.repositories import get_all_analysis_resultss


from api.controllers import analyze_correlation, analyze_incident, detect_anomaly,analyze_solutions,trigger_auto_fix
logger = logging.getLogger("ai-analyzer.routes")
router = APIRouter()


@router.get("/analysis", response_model=list[dict])
async def get_all_analysis_results():
    
        return await get_all_analysis_resultss()


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

@router.post("/trigger/solution/{incident_id}")
async def analyze_incident_route(
    incident_id: str = Path(..., description="The ID of the incident to analyze")
) -> Dict[str, Any]:
    """
    Trigger a solution for an incident by ID
    """
    
    print(f"Trigger solution for  incident: {incident_id}")
    
    return await trigger_auto_fix(incident_id)

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

@router.post("/fix-code")
async def fix_code_route(
    request_data: Dict[str, Any] = Body(..., description="File content and incident details for code fixing")
) -> Dict[str, Any]:
    """
    Generate a fixed version of code based on incident information
    """
    try:
        file_content = request_data.get("file")
        incident = request_data.get("incident")
        
        if not file_content:
            raise HTTPException(status_code=400, detail="Missing required field: file")
        
        if not incident:
            raise HTTPException(status_code=400, detail="Missing required field: incident")
        
        logger.info(f"Generating fix for file in service: {incident.get('serviceName')}")
        
        # Build the prompt for the AI
        prompt = prompt_builder.build_code_fix_prompt(file_content, incident)
        
        # Get the fix from the AI
        result = await gemini_client.generate_code_fix(prompt)
        
        # Return the fixed code
        return {
            "fixedCode": result.get("fixedCode"),
            "confidence": result.get("confidence", 0.0),
            "explanations": result.get("explanations", "")
        }
        
    except Exception as e:
        logger.error(f"Error generating code fix: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))