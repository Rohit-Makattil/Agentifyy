import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
import logging
from datetime import datetime
import threading
import time

load_dotenv()
logger = logging.getLogger(__name__)

# Store scheduled emails
scheduled_emails = []

def send_email_now(to_emails: list, subject: str, body: str, sender_name: str = "Agentify Team") -> dict:
    """
    Send email immediately to multiple recipients
    
    Args:
        to_emails: List of recipient email addresses
        subject: Email subject
        body: Email body content
        sender_name: Name of the sender
        
    Returns:
        Dictionary with send results
    """
    try:
        sender_email = os.getenv("SENDER_EMAIL")
        sender_password = os.getenv("SENDER_PASSWORD")
        
        if not sender_email or not sender_password:
            raise ValueError("SENDER_EMAIL or SENDER_PASSWORD not configured")
        
        results = []
        
        for to_email in to_emails:
            try:
                # Create message
                msg = MIMEMultipart()
                msg['From'] = f"{sender_name} <{sender_email}>"
                msg['To'] = to_email
                msg['Subject'] = subject
                
                msg.attach(MIMEText(body, 'plain'))
                
                # Connect to Gmail SMTP
                server = smtplib.SMTP('smtp.gmail.com', 587)
                server.starttls()
                server.login(sender_email, sender_password)
                
                # Send email
                text = msg.as_string()
                server.sendmail(sender_email, to_email, text)
                server.quit()
                
                logger.info(f"Email sent successfully to {to_email}")
                results.append({"email": to_email, "status": "sent", "success": True})
                
            except Exception as e:
                logger.error(f"Failed to send to {to_email}: {str(e)}")
                results.append({"email": to_email, "status": "failed", "success": False, "error": str(e)})
        
        success_count = sum(1 for r in results if r['success'])
        return {
            "success": success_count > 0,
            "total": len(to_emails),
            "sent": success_count,
            "failed": len(to_emails) - success_count,
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Email sending failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "total": len(to_emails),
            "sent": 0,
            "failed": len(to_emails)
        }

def schedule_email(to_emails: list, subject: str, body: str, scheduled_time: datetime, sender_name: str = "Agentify Team") -> dict:
    """
    Schedule email to be sent at a specific time
    
    Args:
        to_emails: List of recipient email addresses
        subject: Email subject
        body: Email body
        scheduled_time: When to send the email
        sender_name: Sender name
        
    Returns:
        Scheduling confirmation
    """
    try:
        email_id = len(scheduled_emails) + 1
        
        scheduled_data = {
            "id": email_id,
            "to_emails": to_emails,
            "subject": subject,
            "body": body,
            "sender_name": sender_name,
            "scheduled_time": scheduled_time,
            "status": "scheduled"
        }
        
        scheduled_emails.append(scheduled_data)
        
        # Start background thread to send at scheduled time
        thread = threading.Thread(
            target=_send_scheduled_email,
            args=(scheduled_data,)
        )
        thread.daemon = True
        thread.start()
        
        logger.info(f"Email scheduled for {scheduled_time} to {len(to_emails)} recipients")
        
        return {
            "success": True,
            "email_id": email_id,
            "scheduled_for": scheduled_time.isoformat(),
            "recipients": len(to_emails),
            "message": f"Email scheduled successfully for {scheduled_time.strftime('%Y-%m-%d %H:%M')}"
        }
        
    except Exception as e:
        logger.error(f"Email scheduling failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def _send_scheduled_email(email_data: dict):
    """Background worker to send scheduled emails"""
    try:
        scheduled_time = email_data['scheduled_time']
        now = datetime.now()
        
        # Wait until scheduled time
        if scheduled_time > now:
            wait_seconds = (scheduled_time - now).total_seconds()
            logger.info(f"Waiting {wait_seconds} seconds to send email {email_data['id']}")
            time.sleep(wait_seconds)
        
        # Send email
        result = send_email_now(
            email_data['to_emails'],
            email_data['subject'],
            email_data['body'],
            email_data['sender_name']
        )
        
        # Update status
        for scheduled in scheduled_emails:
            if scheduled['id'] == email_data['id']:
                scheduled['status'] = 'sent' if result['success'] else 'failed'
                scheduled['send_result'] = result
                break
        
        logger.info(f"Scheduled email {email_data['id']} sent: {result}")
        
    except Exception as e:
        logger.error(f"Failed to send scheduled email: {str(e)}")
        for scheduled in scheduled_emails:
            if scheduled['id'] == email_data['id']:
                scheduled['status'] = 'failed'
                scheduled['error'] = str(e)
                break

def get_scheduled_emails():
    """Get list of all scheduled emails"""
    return [{
        "id": email['id'],
        "recipients": len(email['to_emails']),
        "subject": email['subject'],
        "scheduled_time": email['scheduled_time'].isoformat(),
        "status": email['status']
    } for email in scheduled_emails]
