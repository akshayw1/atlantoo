# services/ai-analyzer/src/services/notification.py
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Any
from config import settings

logger = logging.getLogger("ai-analyzer.notification")

class NotificationService:
    def __init__(self):
        self.smtp_server = settings.smtp_server
        self.smtp_port = settings.smtp_port
        self.smtp_username = settings.smtp_username
        self.smtp_password = settings.smtp_password
        self.from_email = settings.notification_from_email
        self.enabled = all([self.smtp_server, self.smtp_port, self.smtp_username, 
                           self.smtp_password, self.from_email])
        
        if not self.enabled:
            logger.warning("Email notifications disabled: missing SMTP configuration")
        else:
            logger.info(f"Email notification service initialized with server {self.smtp_server}")
    
    async def send_analysis_notification(self, analysis_result: Dict[str, Any], recipients: List[str] = None):
        """
        Send a notification email with analysis results
        """
        if not self.enabled:
            logger.info("Notification would be sent, but email is not configured")
            return False
        
        if not recipients:
            recipients = settings.default_notification_recipients
            
        if not recipients:
            logger.warning("No recipients specified for notification")
            return False
            
        try:
            # Build the email
            subject = self._build_subject(analysis_result)
            body_html = self._build_email_body(analysis_result)
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = ", ".join(recipients)
            
            # Add HTML content
            msg.attach(MIMEText(body_html, 'html'))
            
            # Connect to SMTP server and send
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
                
            logger.info(f"Sent analysis notification to {len(recipients)} recipients")
            return True
            
        except Exception as e:
            logger.error(f"Error sending notification: {str(e)}")
            return False
    
    def _build_subject(self, analysis_result: Dict[str, Any]) -> str:
        service_name = analysis_result.get("serviceName", "auth-service")
        priority = analysis_result.get("priority", "medium").upper()
        title = analysis_result.get("title", "Issue detected")
        return f"[{priority}] {service_name}: {title}"

    
    def _build_email_body(self, analysis_result: Dict[str, Any]) -> str:
        service_name = analysis_result.get("serviceName", "auth-service")
        title = analysis_result.get("title", "No title provided")
        description = analysis_result.get("description", "No description provided")
        root_cause = analysis_result.get("rootCauseHypothesis", "N/A")
        priority = analysis_result.get("priority", "medium")
        severity = analysis_result.get("severity", "low")
        recommended_steps = analysis_result.get("recommendedNextSteps", [])
        solutions = analysis_result.get("solutions", [])
        incident_id = analysis_result.get("incidentId", "unknown")
        dashboard_url = settings.dashboard_url or "http://localhost:3000"

        html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .container {{ max-width: 800px; margin: auto; padding: 20px; }}
                .header {{ background: #f4f4f4; padding: 10px; border-radius: 5px; }}
                .section {{ margin-top: 20px; }}
                .highlight {{ background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; }}
                .solution {{ background: #e8f5e9; padding: 10px; margin-top: 10px; border-left: 4px solid #4caf50; }}
                .high {{ color: #d32f2f; }}
                .medium {{ color: #f57c00; }}
                .low {{ color: #388e3c; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Incident Analysis for {service_name}</h2>
                    <p><strong>Priority:</strong> <span class="{priority}">{priority.upper()}</span></p>
                    <p><strong>Severity:</strong> <span class="{severity}">{severity.capitalize()}</span></p>
                </div>

                <div class="section">
                    <h3>{title}</h3>
                    <p>{description}</p>
                </div>

                <div class="section highlight">
                    <h4>Root Cause Hypothesis</h4>
                    <p>{root_cause}</p>
                </div>

                <div class="section">
                    <h4>Recommended Next Steps</h4>
                    <ul>
                        {''.join(f"<li>{step}</li>" for step in recommended_steps)}
                    </ul>
                </div>
        """

        if solutions:
            html += """
            <div class="section">
                <h4>Proposed Solutions</h4>
            """
            for solution in solutions:
                steps_html = ''.join(f"<li>{step}</li>" for step in solution.get("steps", []))
                html += f"""
                    <div class="solution">
                        <p><strong>{solution.get('description')}</strong></p>
                        <p><strong>Confidence:</strong> {int(solution.get('confidence', 0) * 100)}%</p>
                        <p><strong>Source:</strong> {solution.get('source')}</p>
                        <p><strong>Status:</strong> {solution.get('implementationStatus')}</p>
                        <ul>{steps_html}</ul>
                    </div>
                """
            html += "</div>"

        html += f"""
            <div class="section">
                <h4>Links</h4>
                <ul>
                    <li><a href="{dashboard_url}/incidents">All Incidents</a></li>
                    <li><a href="{dashboard_url}/incidents/{incident_id}">This Incident</a></li>
                </ul>
            </div>
        </div>
        </body>
        </html>
        """

        return html

notification_service = NotificationService()