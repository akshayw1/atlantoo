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
            service_name=correlation_data.get("serviceName", "unknown"),
            time_window_start=correlation_data.get("timeWindow", {}).get("start", ""),
            time_window_end=correlation_data.get("timeWindow", {}).get("end", ""),
            metrics_summary=metrics_summary,
            logs_summary=logs_summary,
            traces_summary=traces_summary
        )
        
        return formatted_prompt
    
    def build_solution_generation_prompt(self, root_cause_analysis: Dict[str, Any]) -> str:
        """
        Build a prompt for solution generation based on root cause analysis
        """
        template = self._load_template("solution_generation.txt")
        
        # Format root causes
        root_causes = json.dumps(root_cause_analysis.get("rootCauses", []), indent=2)
        
        # Format the prompt with the data
        formatted_prompt = template.format(
            service_name=root_cause_analysis.get("serviceName", "unknown"),
            root_causes=root_causes
        )
        
        return formatted_prompt
    
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


prompt_builder = PromptBuilder()