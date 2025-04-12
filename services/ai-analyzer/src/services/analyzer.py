### 6. Core Analyzer Service

```python
# src/services/analyzer.py
import logging
import json
from typing import Dict, Any, List
import requests

from config import settings
from services.gemini_client import gemini_client
from services.prompt_builder import prompt_builder
from db.repositories import save_analysis_result, update_incident_with_analysis

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
            
            # 3. Get analysis from Gemini
            analysis_result = await gemini_client.analyze_telemetry(prompt)
            
            # 4. Add metadata to the result
            analysis_result["correlationId"] = correlation_id
            analysis_result["incidentId"] = correlation_data.get("incidentId")
            analysis_result["serviceName"] = correlation_data.get("serviceName", "unknown")
            analysis_result["analysisType"] = "root-cause"
            
            # 5. Store the analysis result
            saved_result = await save_analysis_result(analysis_result)
            
            # 6. Update the incident with analysis results
            await update_incident_with_analysis(correlation_data.get("incidentId"), saved_result)
            
            # 7. Generate solutions if root causes were found
            if analysis_result.get("rootCauses") and len(analysis_result["rootCauses"]) > 0:
                solutions = await self.generate_solutions(analysis_result)
                analysis_result["solutions"] = solutions.get("solutions", [])
            
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
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to get correlation {correlation_id}: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting correlation data: {str(e)}")
            return None

analyzer_service = AnalyzerService()