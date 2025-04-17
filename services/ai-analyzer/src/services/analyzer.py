import logging
import json
from typing import Dict, Any, List
import requests

from config import settings
from services.gemini_client import gemini_client
from services.prompt_builder import prompt_builder
from db.repositories import save_analysis_result, update_incident_with_analysis, update_analysis_with_solutions, update_incident_with_solutions
from services.notification import notification_service


logger = logging.getLogger("ai-analyzer.analyzer")

class AnalyzerService:
    def __init__(self):
        self.correlation_engine_url = settings.correlation_engine_url
        logger.info(f"Analyzer service initialized with correlation engine URL: {self.correlation_engine_url}")
    
    async def analyze_correlation(self, correlation_id: str) -> Dict[str, Any]:
        """
        Analyze a correlation by ID
        """
        try:
            # 1. Get correlation data from correlation engine
            correlation_data = await self._get_correlation_data(correlation_id)
            if not correlation_data:
                return {"error": f"Correlation {correlation_id} not found"}
            
            # 2. Build prompt for Gemini API
            prompt = prompt_builder.build_root_cause_analysis_prompt(correlation_data)

            print(f"Analyzing correlation {correlation_id} with prompt: {prompt}")
            
            # 3. Get analysis from Gemini
            analysis_result = await gemini_client.analyze_telemetry(prompt)
            
            # 4. Add metadata to the result
            analysis_result["correlationId"] = correlation_id
            analysis_result["incidentId"] = correlation_data.get("incidentId")
            analysis_result["serviceName"] = correlation_data.get("serviceName", "auth-service")
            analysis_result["analysisType"] = "root-cause"
            
            # 5. Store the analysis result
            saved_result = await save_analysis_result(analysis_result)
            
            # 6. Update the incident with analysis results
            await update_incident_with_analysis(correlation_data.get("incidentId"), saved_result)
            
            # 7. Generate solutions if root causes were found
            if analysis_result.get("rootCauses") and len(analysis_result["rootCauses"]) > 0:
                solutions = await self.generate_solutions(analysis_result)
                analysis_result["solutions"] = solutions.get("solutions", [])
            # Update the stored analysis with solutions
            if "_id" in saved_result:
                # Convert ObjectId to string if it exists
                analysis_id = str(saved_result["_id"]) if saved_result["_id"] else None
                if analysis_id:
                    await update_analysis_with_solutions(analysis_id, solutions.get("solutions", []))
        
            # Make sure we convert any ObjectId to strings for JSON serialization
            if "_id" in analysis_result:
                analysis_result["_id"] = str(analysis_result["_id"])

            if analysis_result.get("rootCauses") or analysis_result.get("priority") == "high":
                await notification_service.send_analysis_notification(analysis_result)
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error analyzing correlation {correlation_id}: {str(e)}")
            return {"error": str(e)}
    
    async def generate_solutions(self, root_cause_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate solutions based on root cause analysis
        """
        try:
            # 1. Build prompt for solution generation
            prompt = prompt_builder.build_solution_generation_prompt(root_cause_analysis)
            
            # 2. Get solutions from Gemini
            solutions = await gemini_client.generate_solutions(prompt)
            
            # 3. Store solutions with the analysis result
            if "solutions" in solutions and root_cause_analysis.get("_id"):
                await update_analysis_with_solutions(root_cause_analysis["_id"], solutions["solutions"])
            
            return solutions
            
        except Exception as e:
            logger.error(f"Error generating solutions: {str(e)}")
            return {"error": str(e), "solutions": []}
    
    async def _get_correlation_data(self, correlation_id: str) -> Dict[str, Any]:
        """
        Get correlation data from the correlation engine
        """
        try:
            url = f"{self.correlation_engine_url}/api/correlations/{correlation_id}"
            response = requests.get(url)

            print(f"Fetching correlation data from {url}")
            
            if response.status_code == 200:
                logger.info(f"Successfully fetched correlation data for {correlation_id}")
                return response.json()
            else:
                logger.error(f"Failed to get correlation {correlation_id}: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting correlation data: {str(e)}")
            return None
    
    async def _get_incident_data(self, incident_id: str) -> Dict[str, Any]:
        """
        Get incident data from the external incidents API
        """
        try:
            url = f"{self.correlation_engine_url}/api/incidents/{incident_id}"
            logger.info(f"Fetching incident data from: {url}")
            
            response = requests.get(url)
            
            if response.status_code == 200:
                logger.info(f"Successfully fetched incident data for {incident_id}")
                return response.json()
            else:
                logger.error(f"Failed to get incident {incident_id}: {response.status_code}")
                return None
                    
        except Exception as e:
            logger.error(f"Error getting incident data: {str(e)}")
            return None
    
    async def detect_anomaly(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Detect anomalies in telemetry data
        """
        try:
            # Validate input data
            if not request_data.get("serviceName") or not request_data.get("timeRange"):
                return {"error": "Missing required fields: serviceName and timeRange"}
            
            # Build prompt for anomaly detection
            prompt = prompt_builder.build_anomaly_detection_prompt(request_data)
            print(f"Detecting anomalies with prompt:")
            
            # Get anomaly detection results from Gemini
            anomaly_result = await gemini_client.detect_anomaly(prompt)
            
            print(f"Anomaly Result send to correlation engine")
            
            # Add metadata
            anomaly_result["serviceName"] = request_data.get("serviceName")
            anomaly_result["timeRange"] = request_data.get("timeRange")
            
            # Store the anomaly detection result
            saved_result = await save_analysis_result(anomaly_result)
            
            # Convert ObjectId to string if present
            if "_id" in saved_result:
                anomaly_result["_id"] = str(saved_result["_id"])
            
            # Send notification if high severity anomalies are detected
            if anomaly_result.get("summary", {}).get("severity") == "high":
                await notification_service.send_analysis_notification(anomaly_result)
            
            return anomaly_result
            
        except Exception as e:
            logger.error(f"Error detecting anomalies: {str(e)}")
            return {"error": str(e)}
    
    async def analyze_incident(self, incident_id: str) -> Dict[str, Any]:
        """
        Analyze an incident by ID to determine root causes
        """
        try:
            # 1. Get incident data
            print(f"Analyzing incident {incident_id}")
            incident_data = await self._get_incident_data(incident_id)

            if not incident_data:
                return {"error": f"Incident {incident_id} not found"}
            
            print(f"Incident data: recived")
            # 2. Build prompt for root cause analysis
            prompt = prompt_builder.build_incident_analysis_prompt(incident_data)
            
            print(f"Analyzing incident {incident_id} with prompt: {prompt}")
            
            # 3. Get analysis from Gemini
            analysis_result = await gemini_client.analyze_telemetry(prompt)
            
            # 4. Add metadata to the result
            analysis_result["incidentId"] = incident_id
            analysis_result["serviceName"] = "auth-service"
            analysis_result["analysisType"] = "incident-analysis"
            
            # 5. Store the analysis result
            saved_result = await save_analysis_result(analysis_result)
            
            # 6. Update the incident with analysis results
            await update_incident_with_analysis(incident_id, saved_result)
            
            # Make sure we convert any ObjectId to strings for JSON serialization
            if "_id" in analysis_result:
                analysis_result["_id"] = str(analysis_result["_id"])
            
            # 7. Send notification for significant findings
            if analysis_result.get("rootCauses") or analysis_result.get("priority") == "high":
                await notification_service.send_analysis_notification(analysis_result)
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error analyzing incident {incident_id}: {str(e)}")
            return {"error": str(e)}
    
    async def generate_incident_solutions(self, incident_id: str, correlation_id: str = None) -> Dict[str, Any]:
        """
        Generate solutions for an incident
        
        This method returns solutions in the format expected by the correlation engine
        """
        try:
            # 1. Get incident data
            incident_data = await self._get_incident_data(incident_id)

            if not incident_data:
                return {"error": f"Incident {incident_id} not found"}
            
            # 2. Get correlation data if available
            correlation_data = None
            if correlation_id:
                correlation_data = await self._get_correlation_data(correlation_id)
            
            # 3. Build prompt for solution generation
            prompt = prompt_builder.build_solution_generation_prompt({
                "incident": incident_data,
                "correlation": correlation_data
            })
            
            # 4. Get solutions from Gemini
            solution_results = await gemini_client.generate_solutions(prompt)
            
            # 5. Format the solutions in the expected format
            formatted_solutions = self._format_solutions(solution_results, incident_data)
            
            # 6. Update the incident with solutions in the database
            if formatted_solutions.get("solutions"):
                await update_incident_with_solutions(incident_id, formatted_solutions)
            
            # 7. Send notification for the solutions
            if formatted_solutions.get("solutions"):
                notification_data = {
                    "incidentId": incident_id,
                    "solutions": formatted_solutions["solutions"],
                    "enhancedRootCause": formatted_solutions.get("enhancedRootCause"),
                    "type": "solutions-generated"
                }
                await notification_service.send_analysis_notification(notification_data)
            
            return formatted_solutions
            
        except Exception as e:
            logger.error(f"Error generating solutions for incident {incident_id}: {str(e)}")
            return {"error": str(e)}
    
    def _format_solutions(self, solution_results: Dict[str, Any], incident_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format solutions to match the expected response format for the correlation engine
        """
        # Default empty response
        formatted_response = {
            "solutions": [],
            "enhancedRootCause": solution_results.get("enhancedRootCause") or incident_data.get("rootCauseHypothesis"),
            "relatedDocumentation": solution_results.get("relatedDocumentation", []),
            "recommendedOwners": solution_results.get("recommendedOwners", [])
        }
        
        # Process solutions if available
        if "solutions" in solution_results and isinstance(solution_results["solutions"], list):
            formatted_solutions = []
            
            for solution in solution_results["solutions"]:
                formatted_solution = {
                    "description": solution.get("description", ""),
                    "steps": solution.get("steps", []),
                    "confidence": solution.get("confidence", 0.5),
                    "expectedImpact": solution.get("expectedImpact", ""),
                    "priority": solution.get("priority", "medium"),
                    "estimatedEffort": solution.get("estimatedEffort", "medium")
                }
                formatted_solutions.append(formatted_solution)
            
            formatted_response["solutions"] = formatted_solutions
        
        return formatted_response


analyzer_service = AnalyzerService()