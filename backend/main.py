import os
import logging
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from apscheduler.schedulers.background import BackgroundScheduler
import pandas as pd
import uuid
import io
import asyncio

from model_runner import generate_code_from_prompt
from utils import make_zip_from_files
from email_agent.email_generator import generate_complete_email
from email_agent.email_sender import send_email_now, schedule_email, get_scheduled_emails
from email_agent.email_poller import poll_replies
from simple_csv_email_agent import SimpleEmailExtractor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

sent_subjects = []
email_cache = {}
scheduled_campaigns = {}

scheduler = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global scheduler
    logger.info("🚀 Starting Agentify Multi-Agent Backend...")
    scheduler = BackgroundScheduler()
    scheduler.add_job(poll_replies, 'interval', minutes=5, args=[sent_subjects], id='email_reply_poller')
    scheduler.add_job(check_and_send_scheduled_campaigns, 'interval', seconds=30, id='scheduled_campaign_checker')
    scheduler.start()
    logger.info("✅ Backend started")
    yield
    logger.info("🛑 Shutting down...")
    if scheduler:
        scheduler.shutdown()
    logger.info("👋 Goodbye!")


def check_and_send_scheduled_campaigns():
    try:
        now = datetime.now()
        campaigns_to_remove = []
        for campaign_id, campaign_data in scheduled_campaigns.items():
            if now >= campaign_data['scheduled_time']:
                logger.info(f"⏰ Time to send campaign: {campaign_id}")
                asyncio.run(execute_scheduled_campaign(campaign_data))
                campaigns_to_remove.append(campaign_id)
        for campaign_id in campaigns_to_remove:
            del scheduled_campaigns[campaign_id]
            logger.info(f"✅ Removed campaign {campaign_id} from scheduler")
    except Exception as e:
        logger.error(f"❌ Error in scheduled campaign checker: {e}")


async def execute_scheduled_campaign(campaign_data):
    try:
        email_data = campaign_data['email_data']
        subject = campaign_data['subject']
        body = campaign_data['body']

        def personalize(original_body, recipient_name):
            result = original_body.replace("Dear Recipient", f"Dear {recipient_name}") \
                                  .replace("Dear recipient", f"Dear {recipient_name}") \
                                  .replace("dear recipient", f"Dear {recipient_name}") \
                                  .replace("{name}", recipient_name) \
                                  .replace("{Name}", recipient_name)
            return result

        sent_count = 0
        failed_count = 0

        for i, recipient in enumerate(email_data, 1):
            try:
                email = recipient["email"]
                name = recipient.get("name", "Friend")
                personalized_body = personalize(body, name)
                result = send_email_now(
                    to_emails=[email],
                    subject=subject,
                    body=personalized_body,
                    sender_name="Agentify Team"
                )
                if result.get('success'):
                    sent_count += 1
                    logger.info(f"✅ [{i}/{len(email_data)}] Scheduled email sent to {name} <{email}>")
                else:
                    failed_count += 1
                    logger.error(f"❌ [{i}/{len(email_data)}] Failed to send to {name} <{email}>")
            except Exception as e:
                failed_count += 1
                logger.error(f"❌ Exception sending scheduled email: {e}")

        logger.info(f"📊 Scheduled campaign complete: {sent_count} sent, {failed_count} failed")
        sent_subjects.append(subject)

    except Exception as e:
        logger.error(f"❌ Error executing scheduled campaign: {e}")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.post("/generate")
async def generate_website(payload: PromptIn):
    try:
        result = generate_code_from_prompt(payload.prompt)
        files = result['files']
        if not files.get("index.html"):
            files["index.html"] = "<!doctype html><html><body><h1>Generated</h1></body></html>"
        return {"files": files, "raw": result.get('raw', '')}
    except Exception as e:
        logger.error(f"❌ Website generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/download-zip")
async def download_website_zip(payload: PromptIn):
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
        logger.error(f"❌ ZIP download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/email/generate")
async def generate_email_content(request: EmailGenerateRequest):
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
        logger.error(f"❌ Email generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/email/send")
async def send_email_endpoint(request: EmailSendRequest):
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
        logger.error(f"❌ Email send error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/email/scheduled")
async def get_scheduled_emails_list():
    try:
        emails = get_scheduled_emails()
        return {
            "success": True,
            "count": len(emails),
            "scheduled_emails": emails
        }
    except Exception as e:
        logger.error(f"❌ Fetch scheduled emails error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/email/status")
async def get_email_status():
    return {
        "total_sent": len(sent_subjects),
        "recent_subjects": sent_subjects[-10:] if sent_subjects else [],
        "scheduled_campaigns": len(scheduled_campaigns)
    }

@app.post("/upload-email-csv")
async def upload_email_csv(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        extractor = SimpleEmailExtractor()
        extraction = extractor.extract_emails(df)
        email_id = str(uuid.uuid4())
        email_cache[email_id] = extraction["email_name_pairs"]
        return {
            "success": True,
            "email_id": email_id,
            "valid_emails": extraction["valid_emails"],
            "invalid_emails": extraction["invalid_emails"],
            "total_valid": extraction["total_valid"],
            "total_invalid": extraction["total_invalid"],
            "email_name_pairs": extraction["email_name_pairs"],
            "message": f"Agent validated {extraction['total_valid']} email addresses with personalization"
        }
    except Exception as e:
        logger.error(f"❌ CSV upload error: {e}")
        return {"success": False, "error": str(e)}

@app.post("/send-bulk-email")
async def send_bulk_email(
    email_id: str = Form(...),
    subject: str = Form(...),
    body: str = Form(...),
    scheduledTime: Optional[str] = Form(None)
):
    try:
        if email_id not in email_cache:
            return {"success": False, "error": "Email list not found"}
        email_data = email_cache[email_id]

        def personalize(original_body, recipient_name):
            result = original_body
            result = result.replace("Dear Recipient", f"Dear {recipient_name}")
            result = result.replace("Dear recipient", f"Dear {recipient_name}")
            result = result.replace("dear recipient", f"Dear {recipient_name}")
            result = result.replace("{name}", recipient_name)
            result = result.replace("{Name}", recipient_name)
            return result

        if scheduledTime:
            try:
                scheduled_time = datetime.fromisoformat(scheduledTime.replace('Z', '+00:00'))
                if scheduled_time <= datetime.now():
                    return {"success": False, "error": "Scheduled time must be in the future"}
                campaign_id = str(uuid.uuid4())
                scheduled_campaigns[campaign_id] = {
                    "email_data": email_data,
                    "subject": subject,
                    "body": body,
                    "scheduled_time": scheduled_time,
                    "total_recipients": len(email_data)
                }
                return {
                    "success": True,
                    "campaign_id": campaign_id,
                    "status": "scheduled",
                    "total_recipients": len(email_data),
                    "scheduled_time": scheduledTime,
                    "message": f"Campaign scheduled for {len(email_data)} recipients at {scheduled_time}"
                }
            except ValueError as e:
                return {"success": False, "error": f"Invalid scheduled time: {str(e)}"}
        sent_count = 0
        failed_count = 0
        failed_emails = []
        for i, recipient in enumerate(email_data, 1):
            try:
                email = recipient["email"]
                name = recipient.get("name", "Friend")
                personalized_body = personalize(body, name)
                result = send_email_now(
                    to_emails=[email],
                    subject=subject,
                    body=personalized_body,
                    sender_name="Agentify Team"
                )
                if result.get('success'):
                    sent_count += 1
                    logger.info(f"✅ [{i}/{len(email_data)}] Email sent to {name} <{email}>")
                else:
                    failed_count += 1
                    failed_emails.append({
                        "email": email,
                        "name": name,
                        "error": result.get('error', 'Unknown error')
                    })
                    logger.error(f"❌ [{i}/{len(email_data)}] Failed to send to {name} <{email}>")
            except Exception as e:
                failed_count += 1
                failed_emails.append({
                    "email": recipient.get("email", "unknown"),
                    "name": recipient.get("name", "Unknown"),
                    "error": str(e)
                })
                logger.error(f"❌ [{i}/{len(email_data)}] Exception sending to {recipient.get('name', 'Unknown')}: {str(e)}")
        sent_subjects.append(subject)
        return {
            "success": True,
            "sent": sent_count,
            "failed": failed_count,
            "total": len(email_data),
            "timestamp": datetime.now().isoformat(),
            "failed_emails": failed_emails[:5]
        }
    except Exception as e:
        logger.error(f"❌ Bulk send error: {str(e)}")
        return {"success": False, "error": str(e)}

@app.get("/campaigns/scheduled")
async def get_scheduled_campaigns():
    try:
        campaigns = []
        for campaign_id, campaign_data in scheduled_campaigns.items():
            campaigns.append({
                "campaign_id": campaign_id,
                "total_recipients": campaign_data['total_recipients'],
                "subject": campaign_data['subject'],
                "scheduled_time": campaign_data['scheduled_time'].isoformat(),
                "time_remaining": str(campaign_data['scheduled_time'] - datetime.now())
            })
        return {
            "success": True,
            "count": len(campaigns),
            "scheduled_campaigns": campaigns
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/")
async def root():
    return {
        "app": "Agentify Multi-Agent Backend",
        "version": "2.3.0",
        "agents": {
            "website_generator": {
                "endpoints": ["/generate", "/download-zip"],
                "status": "active"
            },
            "email_automation": {
                "endpoints": ["/email/generate", "/email/send", "/email/scheduled", "/email/status"],
                "status": "active"
            },
            "email_campaign": {
                "endpoints": ["/upload-email-csv", "/send-bulk-email", "/campaigns/scheduled"],
                "features": ["bulk_send", "name_personalization", "scheduling"],
                "status": "active"
            }
        }
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "agents": ["website_generator", "email_automation", "email_campaign"],
        "scheduled_campaigns": len(scheduled_campaigns),
        "timestamp": datetime.now().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    logger.info(f"🚀 Starting server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
