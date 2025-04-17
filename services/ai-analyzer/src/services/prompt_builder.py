# src/services/prompt_builder.py
import os
import json
from typing import Dict, Any, List


class PromptBuilder:
    def __init__(self):
        self.prompts_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts")
    
    def build_root_cause_analysis_prompt(self, correlation_data: Dict[str, Any]) -> str:
        """
        Build a prompt for root cause analysis based on correlation data
        """
        template = self._load_template("root_cause_analysis.txt")
        
        # Extract metrics summary
        metrics_summary = self._format_metrics(correlation_data.get("telemetry", {}).get("metrics", []))
        
        # Extract logs summary
        logs_summary = self._format_logs(correlation_data.get("telemetry", {}).get("logs", []))
        
        # Extract traces summary
        traces_summary = self._format_traces(correlation_data.get("telemetry", {}).get("traces", []))
        
        # Format the prompt with the data
        formatted_prompt = template.format(
            service_name=correlation_data.get("serviceName", "auth-service"),
            time_window_start=correlation_data.get("timeWindow", {}).get("start", ""),
            time_window_end=correlation_data.get("timeWindow", {}).get("end", ""),
            metrics_summary=metrics_summary,
            logs_summary=logs_summary,
            traces_summary=traces_summary
        )
        
        return formatted_prompt
    
    def build_solution_generation_prompt(self, data: Dict[str, Any]) -> str:
        """
        Build prompt for solution generation based on root cause analysis or incident data
        """
        # Determine if we're dealing with an analysis result or an incident+correlation
        is_incident_request = "incident" in data
        
        if is_incident_request:
            incident_data = data.get("incident", {})
            correlation_data = data.get("correlation", {})
            
            # Extract incident info
            title = incident_data.get("title", "Unknown incident")
            service = incident_data.get("service", "unknown service")
            severity = incident_data.get("severity", "unknown")
            anomalies = incident_data.get("anomalies", [])
            root_cause = incident_data.get("rootCauseHypothesis", "")
            
            # Build the prompt
            prompt = f"""
            # System Context
            You are an AI assistant specializing in proposing solutions for incidents in distributed systems.
            
            # Task
            Generate solution recommendations for the following incident.
            
            # Incident Overview
            - Title: {title}
            - Service: {service}
            - Severity: {severity}
            - Root Cause Hypothesis: {root_cause}
            
            # Detected Anomalies
            """
            
            # Add anomalies to the prompt
            if anomalies:
                for i, anomaly in enumerate(anomalies[:5]):  # Limit to 5 anomalies
                    anomaly_type = anomaly.get("type", "unknown type")
                    anomaly_value = anomaly.get("value", "unknown value")
                    
                    prompt += f"""
                    Anomaly {i+1}:
                    - Type: {anomaly_type}
                    - Value: {anomaly_value}
                    """
                    
                    # Add more details if available
                    if "endpoint" in anomaly:
                        prompt += f"- Endpoint: {anomaly['endpoint']}\n"
                    if "description" in anomaly:
                        prompt += f"- Description: {anomaly['description']}\n"
            else:
                prompt += "No anomalies provided.\n"
            
            # Add correlation data if available
            if correlation_data:
                prompt += "\n# Additional Correlation Data\n"
                # Add relevant correlation data here
            
        else:
            # Using root cause analysis result
            root_causes = data.get("rootCauses", [])
            primary_root_cause = data.get("primaryRootCause", "")
            severity = data.get("severity", "unknown")
            service_name = data.get("serviceName", "auth-service")
            impacted_components = data.get("impactedComponents", [])
            explanation = data.get("explanation", "")
            
            # Build the prompt
            prompt = f"""
            # System Context
            You are an AI assistant specializing in proposing solutions for incidents in distributed systems.
            
            # Task
            Generate solution recommendations based on the following root cause analysis.
            
            # Analysis Overview
            - Service: {service_name}
            - Severity: {severity}
            - Primary Root Cause: {primary_root_cause}
            - Impacted Components: {', '.join(impacted_components) if impacted_components else 'Unknown'}
            - Explanation: {explanation}
            
            # Root Causes
            """
            
            # Add root causes to the prompt
            if root_causes:
                for i, root_cause in enumerate(root_causes):
                    name = root_cause.get("name", "Unknown")
                    description = root_cause.get("description", "")
                    confidence = root_cause.get("confidence", 0)
                    evidence = root_cause.get("evidence", "")
                    
                    prompt += f"""
                    Root Cause {i+1}: {name}
                    - Description: {description}
                    - Confidence: {confidence}
                    - Evidence: {evidence}
                    """
            else:
                prompt += "No root causes identified.\n"
        
        # Add solution generation instructions
        prompt += """
        # Solution Generation Instructions
        1. Propose specific solutions to address the identified root causes
        2. For each solution, provide detailed steps for implementation
        3. Assess the confidence level that each solution will resolve the issue
        4. Estimate the impact and implementation effort for each solution
        5. If the root cause isn't clear, propose diagnostic steps as a solution
        
        # Response Format
        Respond with a JSON object containing:
        ```json
        {
          "solutions": [
            {
              "description": "Brief descriptive title of the solution",
              "steps": [
                "Step 1: Detailed step",
                "Step 2: Detailed step",
                "Step 3: Detailed step"
              ],
              "confidence": 0.8, // 0.0 to 1.0 confidence score
              "expectedImpact": "The expected impact of this solution",
              "priority": "high|medium|low",
              "estimatedEffort": "high|medium|low"
            }
          ],
          "enhancedRootCause": "More detailed root cause based on solution analysis",
          "relatedDocumentation": [
            {
              "title": "Relevant documentation title",
              "url": "URL to documentation if available"
            }
          ],
          "recommendedOwners": ["team-name", "role-name"]
        }
        ```
        
        Focus on practical, actionable solutions that address the specific issues identified.
        """
        
        return prompt
    
    
    def _load_template(self, template_name: str) -> str:
        """
        Load a prompt template from a file
        """
        template_path = os.path.join(self.prompts_dir, template_name)
        try:
            with open(template_path, 'r') as file:
                return file.read()
        except Exception as e:
            # If template doesn't exist, return a basic template
            if template_name == "root_cause_analysis.txt":
                return self._get_default_root_cause_template()
            elif template_name == "solution_generation.txt":
                return self._get_default_solution_template()
            else:
                return ""
    
    def _format_metrics(self, metrics: List[Dict[str, Any]]) -> str:
        """
        Format metrics data for the prompt
        """
        if not metrics:
            return "No metrics data available."
        
        result = "Metrics:\n"
        for metric in metrics[:10]:  # Limit to first 10 metrics
            name = metric.get("name", "unknown")
            values = metric.get("values", [])
            
            if values:
                avg_value = sum(v.get("value", 0) for v in values) / len(values)
                result += f"- {name}: average {avg_value:.2f}\n"
            else:
                result += f"- {name}: no values\n"
        
        return result
    
    def _format_logs(self, logs: List[Dict[str, Any]]) -> str:
        """
        Format logs data for the prompt
        """
        if not logs:
            return "No logs data available."
        
        error_logs = [log for log in logs if log.get("level") == "error"]
        warn_logs = [log for log in logs if log.get("level") == "warn"]
        
        result = f"Logs Summary:\n"
        result += f"- Total logs: {len(logs)}\n"
        result += f"- Error logs: {len(error_logs)}\n"
        result += f"- Warning logs: {len(warn_logs)}\n\n"
        
        if error_logs:
            result += "Sample error logs:\n"
            for log in error_logs[:5]:  # Limit to first 5 error logs
                result += f"- {log.get('timestamp', '')}: {log.get('message', '')}\n"
        
        return result
    
    def _format_traces(self, traces: List[Dict[str, Any]]) -> str:
        """
        Format traces data for the prompt
        """
        if not traces:
            return "No traces data available."
        
        error_traces = [trace for trace in traces if trace.get("hasError", False)]
        
        result = f"Traces Summary:\n"
        result += f"- Total traces: {len(traces)}\n"
        result += f"- Error traces: {len(error_traces)}\n\n"
        
        if traces:
            result += "Sample traces (operation, duration):\n"
            for trace in traces[:5]:  # Limit to first 5 traces
                result += f"- {trace.get('operationName', 'unknown')}: {trace.get('durationMs', 0)}ms\n"
        
        return result
    
    def build_anomaly_detection_prompt(self, request_data: Dict[str, Any]) -> str:
        """
        Build prompt for anomaly detection
        """
        return f"""
        Analyze the following telemetry data to detect anomalies. Focus on identifying unusual patterns in logs, traces, and metrics that could indicate performance issues, errors, or system instability. Provide a JSON response strictly in the format specified below, including a list of detected anomalies and a summary with a title, description, root cause hypothesis, recommended next steps, severity, confidence, and related incidents.

        Telemetry Data:
        Service Name: {request_data.get('serviceName', 'auth-service')}
        Time Range: {json.dumps(request_data.get('timeRange', {}))}
        Telemetry Stats:
        - Log Count: {request_data.get('telemetryStats', {}).get('logCount', 0)}
        - Trace Count: {request_data.get('telemetryStats', {}).get('traceCount', 0)}
        - Metric Types: {json.dumps(request_data.get('telemetryStats', {}).get('metricTypes', []))}
        Sample Logs: {json.dumps(request_data.get('sampleLogs', []), indent=2)}
        Sample Traces: {json.dumps(request_data.get('sampleTraces', []), indent=2)}
        Error Logs: {json.dumps(request_data.get('errorLogs', []), indent=2)}

        Expected JSON Response Format:
        ```json
        {{
          "anomalies": [
            {{
              "type": "ai_detected",
              "description": "string",
              "confidence": number,
              "timestamp": "ISO 8601 string",
              "detectionMethod": "ai",
              "affectedResource": {{
                "type": "string",
                "name": "string"
              }},
              "patterns": {{
                "memoryGrowth": boolean,
                "errorSpikes": boolean,
                "slowResponses": boolean
              }},
              "evidenceReferences": {{
                "logs": ["string"],
                "metrics": ["string"],
                "traces": ["string"]
              }},
              "detectionLogic": "string",
              "severity": "string"
            }}
          ],
          "summary": {{
            "title": "string",
            "description": "string",
            "rootCauseHypothesis": "string",
            "recommendedNextSteps": ["string"],
            "severity": "string",
            "confidence": number,
            "relatedIncidents": ["string"]
          }}
        }}
        """


    def build_incident_analysis_prompt(self, data: Dict[str, Any]) -> str:
        """
        Build prompt for incident analysis focusing on logs to generate solutions in SolutionSchema format
        """
       

        incident_data = data.get("incident", {})
        correlation_data = data.get("correlations", [{}])[0]  # Get the first correlation
        telemetry_logs = correlation_data.get("telemetrySummary", {}).get("log", [])

        # Extract incident info
        title = incident_data.get("title", "Unknown incident")
        service = incident_data.get("service", "unknown service")
        severity = incident_data.get("severity", "unknown")
        start_time = incident_data.get("startTime", "unknown")
        affected_endpoints = incident_data.get("affectedEndpoints", [])
        impacted_services = incident_data.get("impactedServices", [])
        ai_description = incident_data.get("aiDescription", "")
        root_cause_hypothesis = incident_data.get("rootCauseHypothesis", "")
        anomalies = incident_data.get("anomalies", [])

        # Initialize prompt
        prompt = f"""
    # System Context
    You are an AI assistant specializing in analyzing incidents in distributed systems to propose actionable solutions based on provided incident details and telemetry data and anomaly details.

    # Task
    Analyze the following incident and its associated telemetry data to confirm or refine the root cause and propose solutions. Focus exclusively on the logs to understand the error context, and do not consider metrics or traces. Generate solutions that address the identified issues, formatted according to the provided schema.

    # Incident Overview
    - Title: {title}
    - Service: {service}
    - Severity: {severity}
    - Start Time: {start_time}
    - Affected Endpoints: {', '.join(affected_endpoints) if affected_endpoints else 'None'}
    - Impacted Services: {', '.join(impacted_services) if impacted_services else 'None'}
    - AI-Generated Description: {ai_description}
    - Root Cause Hypothesis: {root_cause_hypothesis}

    # Detected Anomalies
    """
        # Add anomalies to the prompt
        if anomalies:
            for i, anomaly in enumerate(anomalies[:5]):  # Limit to 5 anomalies
                anomaly_type = anomaly.get("type", "unknown type")
                timestamp = anomaly.get("timestamp", "unknown")
                detection_method = anomaly.get("detectionMethod", "unknown")
                prompt += f"""
    Anomaly {i+1}:
    - Type: {anomaly_type}
    - Timestamp: {timestamp}
    - Detection Method: {detection_method}
    """
                if anomaly_type == "error_rate_threshold":
                    metric = anomaly.get("metric", "unknown")
                    value = anomaly.get("value", "unknown")
                    threshold = anomaly.get("threshold", "unknown")
                    prompt += f"- Metric: {metric}\n- Value: {value}\n- Threshold: {threshold}\n"
                elif anomaly_type == "error_detected":
                    prompt += "- Details: AI-detected error\n"
        else:
            prompt += "No anomalies provided.\n"

        # Add telemetry logs
        prompt += "\n# Telemetry Logs\n"
        if telemetry_logs:
            error_logs = [log for log in telemetry_logs if log.get("level") == "ERROR"]
            if error_logs:
                prompt += "Error Logs:\n"
                for log in error_logs[:5]:  # Limit to 5 error logs
                    timestamp = log.get("@timestamp", "unknown")
                    message = log.get("message", "unknown")
                    stack_trace = log.get("stack_trace", "none")
                    prompt += f"""
    - Timestamp: {timestamp}
      Message: {message}
      Stack Trace: {stack_trace}
    """
            else:
                prompt += "No error logs found.\n"

            # Include a summary of other logs
            debug_logs = [log for log in telemetry_logs if log.get("level") == "DEBUG"]
            info_logs = [log for log in telemetry_logs if log.get("level") == "INFO"]
            prompt += f"""
    Log Summary:
    - Total Logs: {len(telemetry_logs)}
    - Error Logs: {len(error_logs)}
    - Debug Logs: {len(debug_logs)}
    - Info Logs: {len(info_logs)}
    """
            if info_logs:
                prompt += "Sample Info Logs:\n"
                for log in info_logs[:2]:  # Limit to 2 info logs
                    timestamp = log.get("@timestamp", "unknown")
                    message = log.get("message", "unknown")
                    prompt += f"- {timestamp}: {message}\n"
        else:
            prompt += "No telemetry logs provided.\n"

        # Add analysis and response instructions
        prompt += """
    # Analysis Instructions
    1. Analyze the incident details, root cause hypothesis, and telemetry logs to confirm or refine the root cause.
    2. Focus on the error logs, particularly the stack trace and error messages, to identify specific issues.
    3. Propose actionable solutions to resolve the incident, prioritizing fixes for the identified root cause.
    4. If the root cause is unclear, suggest diagnostic steps to gather more information.
    5. Assign a confidence score (0.0 to 1.0) for each solution based on the evidence in the logs.
    6. Ensure solutions are practical, specific, and tied to the provided information.

    # Expected JSON Response Format
    ```json
    {
        "title": "string",
        "description": "string",
        "rootCauseHypothesis": "string",
        "recommendedNextSteps": ["string"],
        "severity": "string",
        "priorty": "high|medium|low",
        "confidence": number,
        "enhancedRootCause": "string",
        "relatedIncidents": ["string"],
        "errorLocation": {
            "service": "string",
            "file": "string",
            "className": "string",
            "methodName": "string",
            "lineNumber": 0,
            "exceptionType": "string",
            "exceptionMessage": "string"
          },
        "solutions": [
          {
            "description": "string",
            "steps": ["string"],
            "confidence": number,
            "source": "ai",
            "implementationStatus": "proposed",
            "createdAt": "ISO 8601 string",
            "updatedAt": "ISO 8601 string"
          }
        ]
      }
    }
    ```

    # Notes
    - The `solutions` array must follow the provided schema, with `source` set to "ai" and `implementationStatus` set to "proposed".
    - Use the current timestamp (ISO 8601 format) for `createdAt` and `updatedAt` in each solution.
    - Ensure `evidenceReferences` only includes logs, as metrics and traces are not provided.
    - Focus on solutions that directly address the issues identified in the logs, and given anomalies.
    - Keep the response concise and actionable, avoiding speculation beyond the provided data.
    """
        return prompt
      
  
    def _get_default_root_cause_template(self) -> str:
        """
        Get a default template for root cause analysis
        """
        return """You are an expert system diagnostics AI.

System Context:
Service: {service_name}
Time Window: {time_window_start} to {time_window_end}

Current Observation:
{metrics_summary}

{logs_summary}

{traces_summary}

Analyze this data and identify the most likely root causes of any abnormal behavior.
Format your response as JSON with the following structure:
```json
{{
  "rootCauses": [
    {{
      "cause": "description of the cause",
      "confidence": 0.0-1.0,
      "evidence": ["reason1", "reason2"]
    }}
  ],
  "affectedServices": ["service1", "service2"],
  "priority": "high/medium/low",
  "confidence": 0.0-1.0
}}"""

def _get_default_solution_template(self) -> str:
    """
    Get a default template for solution generation
    """
    return """You are an expert system operations AI.

    Based on the following root cause analysis for service: {service_name}
Root Causes:
{root_causes}
Generate potential solutions for these issues. For each solution, provide:

A brief title
A description of the solution
Step-by-step implementation instructions
Confidence level (0.0-1.0)
Potential impact (low/medium/high)
Category (configuration/scaling/code/infrastructure)

Format your response as JSON with the following structure:
```json
{{
  "solutions": [
    {{
      "title": "title of the solution",
      "description": "description of the solution",
      "steps": ["step1", "step2"],
      "confidence": 0.0-1.0,
      "impact": "low/medium/high",
      "category": "configuration/scaling/code/infrastructure"
    }}
  ]
}}"""



def build_code_fix_prompt(self, file_content: str, incident: Dict[str, Any]) -> str:
    """
    Build a prompt for code fixing based on file content and incident details.
    
    Args:
        file_content: The content of the file to be fixed
        incident: The incident details containing error information
        
    Returns:
        A well-structured prompt for the AI model
    """
    error_location = incident.get("errorLocation", {})
    
    prompt = f"""# Code Fix Request

## File Content
```
{file_content}
```

## Error Information
- **Service**: {incident.get("serviceName")}
- **File**: {error_location.get("file")}
- **Class**: {error_location.get("className")}
- **Method**: {error_location.get("methodName")}
- **Line Number**: {error_location.get("lineNumber")}
- **Exception Type**: {error_location.get("exceptionType")}
- **Exception Message**: {error_location.get("exceptionMessage")}

## Incident Details
- **Title**: {incident.get("title")}
- **Description**: {incident.get("description")}
- **Root Cause Hypothesis**: {incident.get("rootCauseHypothesis")}

## Suggested Solutions
"""

    # Add any solutions if available
    solutions = incident.get("solutions", [])
    if solutions:
        for i, solution in enumerate(solutions, 1):
            prompt += f"""
### Solution {i}: {solution.get('description', '')}
{solution.get('steps', [])}
"""

    # Add instructions for the response format
    prompt += """
## Task
1. Analyze the file content and the error information
2. Identify the exact location of the problem
3. Fix the code to address the error while maintaining the original functionality
4. Return ONLY the complete fixed file content, maintaining all imports, formatting, and non-problematic code

## Response Format
Your response should be a JSON object with the following structure:
```json
{
  "fixedCode": "// The complete fixed file content",
  "confidence": 0.95,
  "explanations": "Brief explanation of the changes made"
}
```

IMPORTANT: Make only the minimal changes necessary to fix the specific error. Do not refactor or optimize other parts of the code unless directly related to fixing the error.
"""

    return prompt
  
  

prompt_builder = PromptBuilder()