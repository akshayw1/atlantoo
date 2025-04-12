# src/db/repositories.py
import logging
from typing import Dict, Any, List
import datetime
import requests
from bson.objectid import ObjectId

from db.mongo_client import mongodb
from config import settings

logger = logging.getLogger("ai-analyzer.repositories")

async def save_analysis_result(result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Save an analysis result to the database
    """
    try:
        collection = mongodb.get_collection("analysis_results")
        
        # Add timestamp
        result["createdAt"] = datetime.datetime.utcnow()
        
        # Insert the result
        inserted_id = collection.insert_one(result).inserted_id
        
        # Get the inserted document
        saved_result = collection.find_one({"_id": inserted_id})
        
        # Convert ObjectId to string
        saved_result["_id"] = str(saved_result["_id"])
        
        logger.info(f"Saved analysis result: {saved_result['_id']}")
        return saved_result
        
    except Exception as e:
        logger.error(f"Error saving analysis result: {str(e)}")
        return result

async def update_incident_with_analysis(incident_id: str, analysis: Dict[str, Any]) -> bool:
    """
    Update an incident with analysis results via the correlation engine API
    """
    try:
        # For the prototype, we'll just add the analysis ID to the incident metadata
        url = f"{settings.correlation_engine_url}/api/incidents/{incident_id}/analysis"
        
        payload = {
            "analysis": {
                "id": analysis.get("_id"),
                "rootCauses": analysis.get("rootCauses", []),
                "priority": analysis.get("priority", "medium"),
                "confidence": analysis.get("confidence", 0.0)
            }
        }
        
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            logger.info(f"Updated incident {incident_id} with analysis {analysis.get('_id')}")
            return True
        else:
            logger.error(f"Failed to update incident: {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"Error updating incident with analysis: {str(e)}")
        return False

async def update_analysis_with_solutions(analysis_id: str, solutions: List[Dict[str, Any]]) -> bool:
    """
    Update an analysis result with solutions
    """
    try:
        collection = mongodb.get_collection("analysis_results")
        
        # Update the document
        result = collection.update_one(
            {"_id": ObjectId(analysis_id)},
            {"$set": {"solutions": solutions, "updatedAt": datetime.datetime.utcnow()}}
        )
        
        logger.info(f"Updated analysis {analysis_id} with {len(solutions)} solutions")
        return result.modified_count > 0
        
    except Exception as e:
        logger.error(f"Error updating analysis with solutions: {str(e)}")
        return False