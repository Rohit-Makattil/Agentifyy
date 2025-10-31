"""
Agentify Multi-Agent Backend - Clean Version
Website Generator + Email Automation Agent
"""

import os
import logging
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from apscheduler.schedulers.background import BackgroundScheduler

# Website Generator imports
from model_runner import generate_code_from_prompt
from utils import make_zip_from_files

# Email Agent imports
from email_agent.email_generator import generate_complete_email
from email_agent.email_sender import send_email_now, schedule_email, get_scheduled_emails
from email_agent.email_poller import poll_replies

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Track sent emails
sent_subjects = []

# ============================================
# LIFESPAN CONTEXT MANAGER (Modern FastAPI)
# ============================================

scheduler = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    global scheduler
    
    # Startup
    logger.info("🚀 Starting Agentify Multi-Agent Backend...")
    logger.info("=" * 60)
    
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        lambda: poll_replies(sent_subjects),
        'interval',
        minutes=5,
        id='email_reply_poller'
    )
    scheduler.start()
    
    logger.info("✅ Backend started - Website Generator + Email Agent ready")
    logger.info("=" * 60)
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down...")
    if scheduler:
        scheduler.shutdown()
    logger.info("👋 Goodbye!")

# Initialize FastAPI with lifespan
app = FastAPI(lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# MODELS
# ============================================

class PromptIn(BaseModel):
    prompt: str

class EmailGenerateRequest(BaseModel):
    subject: str
    mailDescription: str
    receiverName: str = "Recipient"
    senderName: str = "Agentify Team"

class EmailSendRequest(BaseModel):
    subject: str
    body: str
    recipients: List[str]
    scheduledTime: Optional[str] = None
    senderName: str = "Agentify Team"

# ============================================
# WEBSITE GENERATOR ENDPOINTS
# ============================================

@app.post("/generate")
async def generate_website(payload: PromptIn):
    """Generate website code"""
    try:
        result = generate_code_from_prompt(payload.prompt)
        files = result['files']
        
        if not files.get("index.html"):
            files["index.html"] = "<!doctype html><html><body><h1>Generated</h1></body></html>"
        
        return {"files": files, "raw": result.get('raw', '')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/download-zip")
async def download_website_zip(payload: PromptIn):
    """Download website as ZIP"""
    try:
        result = generate_code_from_prompt(payload.prompt)
        files = result['files']
        zip_buf = make_zip_from_files(files)
        
        return Response(
            content=zip_buf.getvalue(),
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=website.zip"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# EMAIL AUTOMATION ENDPOINTS
# ============================================

@app.post("/email/generate")
async def generate_email_content(request: EmailGenerateRequest):
    """Generate professional email"""
    try:
        result = generate_complete_email(
            subject=request.subject,
            mail_description=request.mailDescription,
            receiver_name=request.receiverName,
            sender_name=request.senderName
        )
        
        if result['success']:
            return {
                "success": True,
                "emailBody": result['email_body'],
                "subject": result['subject'],
                "previewHtml": result['preview_html']
            }
        else:
            raise HTTPException(status_code=500, detail=result.get('error'))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/email/send")
async def send_email_endpoint(request: EmailSendRequest):
    """Send or schedule email"""
    try:
        if not request.recipients:
            raise HTTPException(status_code=400, detail="Recipients required")
        
        valid_recipients = [email.strip() for email in request.recipients if email.strip()]
        
        if request.scheduledTime:
            scheduled_time = datetime.fromisoformat(request.scheduledTime.replace('Z', '+00:00'))
            result = schedule_email(
                to_emails=valid_recipients,
                subject=request.subject,
                body=request.body,
                scheduled_time=scheduled_time,
                sender_name=request.senderName
            )
        else:
            result = send_email_now(
                to_emails=valid_recipients,
                subject=request.subject,
                body=request.body,
                sender_name=request.senderName
            )
            if result['success']:
                sent_subjects.append(request.subject)
        
        if result['success']:
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get('error'))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/email/scheduled")
async def get_scheduled_emails_list():
    """Get scheduled emails list"""
    try:
        emails = get_scheduled_emails()
        return {
            "success": True,
            "count": len(emails),
            "scheduled_emails": emails
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/email/status")
async def get_email_status():
    """Get email status"""
    return {
        "total_sent": len(sent_subjects),
        "recent_subjects": sent_subjects[-10:] if sent_subjects else []
    }

# ============================================
# ROOT
# ============================================

@app.get("/")
async def root():
    """API info"""
    return {
        "app": "Agentify Multi-Agent Backend",
        "version": "2.0.0",
        "agents": {
            "website_generator": {
                "endpoints": ["/generate", "/download-zip"],
                "status": "active"
            },
            "email_automation": {
                "endpoints": ["/email/generate", "/email/send", "/email/scheduled", "/email/status"],
                "status": "active"
            }
        }
    }

@app.get("/health")
async def health_check():
    """Health check"""
    return {"status": "healthy", "agents": ["website_generator", "email_automation"]}

# ============================================
# RUN
# ============================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    logger.info(f"🚀 Starting server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
