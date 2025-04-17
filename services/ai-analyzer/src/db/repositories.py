# src/db/repositories.py
import logging
from typing import Dict, Any, List
import datetime
import requests
from bson.objectid import ObjectId

from db.mongo_client import mongodb
from config import settings

logger = logging.getLogger("ai-analyzer.repositories")
# Add at the top of your repositories.py file
# incident_collection = mongodb.get_collection("incidents")
# analysis_collection = mongodb.get_collection("analysis_results")

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

async def get_incident_data(incident_id: str) -> Dict[str, Any]:
    """
    Get incident data by ID
    """
    try:
        collection = mongodb.get_collection("incidents")
        # Convert string ID to ObjectId
        object_id = ObjectId(incident_id)
        
        # Find in database
        result = await collection.find_one({"_id": object_id})
        
        print(f"Incident founded in AI service ID: {incident_id}")
        
        if result:
            # Convert ObjectId to string for JSON serialization
            result["_id"] = str(result["_id"])
            
            logger.info(f"Retrieved incident with ID: {incident_id}")
            return result
        else:
            logger.warning(f"Incident not found with ID: {incident_id}")
            return None
    except Exception as e:
        logger.error(f"Error getting incident data: {str(e)}")
        return None

async def update_incident_with_analysis(incident_id: str, analysis: Dict[str, Any]) -> bool:
    """
    Update an incident with analysis results
    """
    try:
        if not incident_id:
            logger.warning("Cannot update incident: No incident ID provided")
            return False
        
        # Extract root causes
        root_causes = analysis.get("rootCauses", [])
        primary_root_cause = analysis.get("primaryRootCause", "")
        severity = analysis.get("severity", "")
        
        # Build update document
        update_doc = {
            "rootCauseAnalysis": {
                "analysisId": str(analysis.get("_id", "")),
                "rootCauses": root_causes,
                "primaryRootCause": primary_root_cause,
                "severity": severity,
                "timestamp": datetime.utcnow()
            },
            "updatedAt": datetime.utcnow()
        }
        
        # If we have a primary root cause, add it to the root cause hypothesis
        if primary_root_cause:
            update_doc["rootCauseHypothesis"] = primary_root_cause
        
        # Update incident status to investigating
        update_doc["status"] = "investigating"
        
        # Update in database
        result = await incident_collection.update_one(
            {"_id": ObjectId(incident_id)},
            {"$set": update_doc}
        )
        
        if result.modified_count > 0:
            logger.info(f"Updated incident {incident_id} with analysis results")
            return True
        else:
            logger.warning(f"Incident {incident_id} not found or not updated")
            return False
    except Exception as e:
        logger.error(f"Error updating incident with analysis: {str(e)}")
        return False

async def get_analysis_result(analysis_id: str) -> Dict[str, Any]:
    """
    Get analysis result by ID
    """
    try:
        # Convert string ID to ObjectId
        object_id = ObjectId(analysis_id)
        
        # Find in database
        result = await analysis_collection.find_one({"_id": object_id})
        
        if result:
            logger.info(f"Retrieved analysis result with ID: {analysis_id}")
            return result
        else:
            logger.warning(f"Analysis result not found with ID: {analysis_id}")
            return None
    except Exception as e:
        logger.error(f"Error getting analysis result: {str(e)}")
        return None
    

async def update_incident_with_solutions(incident_id: str, solution_data: Dict[str, Any]) -> bool:
    """
    Update an incident with solution recommendations
    """
    try:
        if not incident_id:
            logger.warning("Cannot update incident: No incident ID provided")
            return False
        
        # Extract solutions and enhanced root cause
        solutions = solution_data.get("solutions", [])
        enhanced_root_cause = solution_data.get("enhancedRootCause", "")
        
        # Build update document
        update_doc = {
            "solutions": solutions,
            "hasSolutions": True,
            "updatedAt": datetime.utcnow()
        }
        
        # If we have an enhanced root cause, update it
        if enhanced_root_cause:
            update_doc["rootCauseHypothesis"] = enhanced_root_cause
        
        # Update in database
        result = await incident_collection.update_one(
            {"_id": ObjectId(incident_id)},
            {"$set": update_doc}
        )
        
        if result.modified_count > 0:
            logger.info(f"Updated incident {incident_id} with {len(solutions)} solutions")
            return True
        else:
            logger.warning(f"Incident {incident_id} not found or not updated")
            return False
    except Exception as e:
        logger.error(f"Error updating incident with solutions: {str(e)}")
        return False

async def update_analysis_with_solutions(analysis_id: str, solutions: List[Dict[str, Any]]) -> bool:
    
    """
    Update an incident with solution recommendations
    """
    try:
        if not incident_id:
            logger.warning("Cannot update incident: No incident ID provided")
            return False
        
        # Extract solutions and enhanced root cause
        solutions = solution_data.get("solutions", [])
        enhanced_root_cause = solution_data.get("enhancedRootCause", "")
        
        # Build update document
        update_doc = {
            "solutions": solutions,
            "hasSolutions": True,
            "updatedAt": datetime.utcnow()
        }
        
        # If we have an enhanced root cause, update it
        if enhanced_root_cause:
            update_doc["rootCauseHypothesis"] = enhanced_root_cause
        
        # Update in database
        result = await incident_collection.update_one(
            {"_id": ObjectId(incident_id)},
            {"$set": update_doc}
        )
        
        if result.modified_count > 0:
            logger.info(f"Updated incident {incident_id} with {len(solutions)} solutions")
            return True
        else:
            logger.warning(f"Incident {incident_id} not found or not updated")
            return False
    except Exception as e:
        logger.error(f"Error updating incident with solutions: {str(e)}")
        return False

    """
    Get incident data by ID
    """
    try:
        # Convert string ID to ObjectId
        object_id = ObjectId(incident_id)
        
        # Find in database
        result = await incident_collection.find_one({"_id": object_id})
        
        if result:
            # Convert ObjectId to string for JSON serialization
            result["_id"] = str(result["_id"])
            
            logger.info(f"Retrieved incident with ID: {incident_id}")
            return result
        else:
            logger.warning(f"Incident not found with ID: {incident_id}")
            return None
    except Exception as e:
        logger.error(f"Error getting incident data: {str(e)}")
        return None
    """
    Update an existing analysis with solutions
    """
    try:
        # Convert string ID to ObjectId
        object_id = ObjectId(analysis_id)
        
        # Update in database
        result = await analysis_collection.update_one(
            {"_id": object_id},
            {"$set": {
                "solutions": solutions,
                "updatedAt": datetime.utcnow()
            }}
        )
        
        if result.modified_count > 0:
            logger.info(f"Updated analysis {analysis_id} with {len(solutions)} solutions")
            return True
        else:
            logger.warning(f"Analysis {analysis_id} not found or not updated")
            return False
    except Exception as e:
        logger.error(f"Error updating analysis with solutions: {str(e)}")
        return False
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