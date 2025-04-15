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
        """
        Build the email subject based on analysis result
        """
        service_name = analysis_result.get("serviceName", "Unknown service")
        priority = analysis_result.get("priority", "medium").upper()
        root_causes = analysis_result.get("rootCauses", [])
        
        if not root_causes:
            return f"[{priority}] All systems normal for {service_name}"
            
        primary_cause = root_causes[0].get("cause", "Issue detected")
        return f"[{priority}] {service_name}: {primary_cause}"
    
    def _build_email_body(self, analysis_result: Dict[str, Any]) -> str:
        """
        Build the HTML email body with analysis details
        """
        service_name = analysis_result.get("serviceName", "Unknown service")
        root_causes = analysis_result.get("rootCauses", [])
        solutions = analysis_result.get("solutions", [])
        correlation_id = analysis_result.get("correlationId", "unknown")
        
        # Start building HTML
        html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 800px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #f4f4f4; padding: 10px; border-radius: 5px; }}
                .section {{ margin: 20px 0; }}
                .cause {{ background-color: #fff8e1; padding: 10px; margin: 10px 0; border-left: 4px solid #ffc107; }}
                .solution {{ background-color: #e8f5e9; padding: 10px; margin: 10px 0; border-left: 4px solid #4caf50; }}
                .high {{ color: #d32f2f; }}
                .medium {{ color: #f57c00; }}
                .low {{ color: #388e3c; }}
                ul {{ padding-left: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Observability Alert: {service_name}</h2>
                    <p>Priority: <span class="{analysis_result.get('priority', 'medium')}">{analysis_result.get('priority', 'medium').upper()}</span></p>
                </div>
        """
        
        # Root causes section
        html += """
                <div class="section">
                    <h3>Diagnosis Results</h3>
        """
        
        if not root_causes:
            html += "<p>No issues detected. System appears to be functioning normally.</p>"
        else:
            for cause in root_causes:
                confidence = int(cause.get("confidence", 0) * 100)
                evidence_list = "".join([f"<li>{e}</li>" for e in cause.get("evidence", [])])
                
                html += f"""
                    <div class="cause">
                        <h4>{cause.get('cause', 'Unknown issue')}</h4>
                        <p>Confidence: {confidence}%</p>
                        <p>Evidence:</p>
                        <ul>
                            {evidence_list}
                        </ul>
                    </div>
                """
        
        html += "</div>"
        
        # Solutions section
        if solutions:
            html += """
                <div class="section">
                    <h3>Recommended Actions</h3>
            """
            
            for solution in solutions:
                confidence = int(solution.get("confidence", 0) * 100)
                steps_list = "".join([f"<li>{s}</li>" for s in solution.get("steps", [])])
                
                html += f"""
                    <div class="solution">
                        <h4>{solution.get('title', 'Unnamed solution')}</h4>
                        <p>{solution.get('description', '')}</p>
                        <p>Confidence: {confidence}% | Impact: {solution.get('impact', 'unknown')} | Category: {solution.get('category', 'unknown')}</p>
                        <p>Implementation Steps:</p>
                        <ol>
                            {steps_list}
                        </ol>
                    </div>
                """
            
            html += "</div>"
        
        # Links section
        dashboard_url = settings.dashboard_url or "http://localhost:3000"
        html += f"""
                <div class="section">
                    <h3>Links</h3>
                    <ul>
                        <li><a href="{dashboard_url}/incidents">View All Incidents</a></li>
                        <li><a href="{dashboard_url}/correlations/{correlation_id}">View This Correlation</a></li>
                    </ul>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html

notification_service = NotificationService()