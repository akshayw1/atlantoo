# src/services/gemini_client.py
import google.generativeai as genai
import logging
from typing import Dict, Any

from config import settings

logger = logging.getLogger("ai-analyzer.gemini")

class GeminiClient:
    def __init__(self):
        if not settings.gemini_api_key:
            logger.warning("No Gemini API key provided! Using mock responses for development.")
            self.mock_mode = True
        else:
            self.mock_mode = False
            genai.configure(api_key=settings.gemini_api_key)
            
        logger.info(f"Gemini client initialized (mock mode: {self.mock_mode})")
    
    async def analyze_telemetry(self, prompt: str) -> Dict[str, Any]:
        """
        Send telemetry data to Gemini API for analysis
        """
        if self.mock_mode:
            return self._get_mock_response()
        
        try:
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content(prompt)
            
            # Parse response text as JSON
            return self._parse_response(response.text)
            
        except Exception as e:
            logger.error(f"Error calling Gemini API: {str(e)}")
            return {
                "error": str(e),
                "rootCauses": [],
                "confidence": 0.0
            }
    
    async def generate_solutions(self, prompt: str) -> Dict[str, Any]:
        """
        Generate solution recommendations based on root cause analysis
        """
        if self.mock_mode:
            return self._get_mock_solutions()
        
        try:
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content(prompt)
            
            # Parse response text as JSON
            return self._parse_response(response.text)
            
        except Exception as e:
            logger.error(f"Error calling Gemini API: {str(e)}")
            return {
                "error": str(e),
                "solutions": []
            }
    
    def _parse_response(self, text: str) -> Dict[str, Any]:
        """
        Parse the JSON response from Gemini API
        """
        try:
            # Extract JSON portion from response
            import json
            import re
            
            # Find text between triple backticks
            json_match = re.search(r'```json\n(.*?)\n```', text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # Try to find any JSON object in the text
                json_match = re.search(r'{.*}', text, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                else:
                    json_str = text
            
            return json.loads(json_str)
        except Exception as e:
            logger.error(f"Error parsing Gemini response: {str(e)}")
            return {"error": "Failed to parse response", "raw_response": text}
    
    def _get_mock_response(self) -> Dict[str, Any]:
        """
        Get a mock response for development without API key
        """
        return {
            "rootCauses": [
                {
                    "cause": "High database connection pool utilization",
                    "confidence": 0.85,
                    "evidence": [
                        "Latency spike in database operations",
                        "Connection timeout errors in logs",
                        "High number of pending requests"
                    ]
                },
                {
                    "cause": "Memory pressure on service instance",
                    "confidence": 0.65,
                    "evidence": [
                        "Increasing memory usage trend",
                        "Occasional garbage collection pauses",
                        "Slower response times across all endpoints"
                    ]
                }
            ],
            "affectedServices": ["service-a", "database"],
            "priority": "high",
            "confidence": 0.85
        }
    
    def _get_mock_solutions(self) -> Dict[str, Any]:
        """
        Get mock solution recommendations
        """
        return {
            "solutions": [
                {
                    "title": "Increase database connection pool size",
                    "description": "The current connection pool size is insufficient for the current load, leading to connection timeouts.",
                    "steps": [
                        "Increase hikariCP maxPoolSize from 10 to 20",
                        "Adjust idle timeout to 600000ms (10 minutes)",
                        "Apply changes via configuration update"
                    ],
                    "confidence": 0.9,
                    "impact": "medium",
                    "category": "configuration"
                },
                {
                    "title": "Scale up service instances",
                    "description": "Current instances are experiencing memory pressure due to high load.",
                    "steps": [
                        "Increase replica count from 2 to 3",
                        "Monitor memory usage after scaling"
                    ],
                    "confidence": 0.7,
                    "impact": "medium",
                    "category": "scaling"
                }
            ]
        }

gemini_client = GeminiClient()