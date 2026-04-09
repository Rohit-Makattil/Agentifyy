import os
import re
import pathlib
import logging
import io
import base64
import urllib.parse
import asyncio
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from apscheduler.schedulers.background import BackgroundScheduler
import pandas as pd
import uuid
from bs4 import BeautifulSoup
import httpx


# Social Media Agent imports
from social_post_agent import generate_social_content, generate_image_from_prompt, post_content

# Email Agent imports
from email_agent.email_generator import generate_complete_email
from email_agent.email_sender import send_email_now, schedule_email, get_scheduled_emails
from email_agent.gsheets_tracker import record_email_response
from simple_csv_email_agent import SimpleEmailExtractor
from model_runner import generate_code_from_prompt
from fastapi.responses import HTMLResponse

# Global cache for CSV uploads
csv_cache = {}
email_extractor = SimpleEmailExtractor()

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SocialGenerateRequest(BaseModel):
    theme: str
    topic: str
    description: str
    platforms: List[str]

class SocialImageRequest(BaseModel):
    prompt: str

class SocialPostRequest(BaseModel):
    caption: str
    platforms: List[str]
    image_base64: Optional[str] = None
    # Optional credentials overrides
    tw_api_key: Optional[str] = ""
    tw_api_secret: Optional[str] = ""
    tw_access_token: Optional[str] = ""
    tw_access_secret: Optional[str] = ""
    ig_username: Optional[str] = ""
    ig_password: Optional[str] = ""

class WebsiteGenerateRequest(BaseModel):
    prompt: str
    theme: str = ""

# --- EMAIL MODELS ---

class EmailGenerateRequest(BaseModel):
    subject: str
    mail_description: str
    receiver_name: str = "Recipient"
    sender_name: str = "Agentify Team"

class EmailSendRequest(BaseModel):
    subject: str
    body: str
    to_emails: List[str]
    sender_name: str = "Agentify Team"
    scheduled_time: Optional[str] = None
    include_response_buttons: bool = False

class BulkEmailRequest(BaseModel):
    cache_id: str
    subject: str
    body: str
    scheduled_time: Optional[str] = None
    include_response_buttons: bool = False

# --- LEAD FINDER MODELS ---

class Lead(BaseModel):
    name: str
    phone: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    crawled_emails: List[str] = []

class LeadsResponse(BaseModel):
    total_leads: int
    leads: List[Lead]

# OSM API Configuration
USER_AGENT = "LeadForgeAI-v1.2-Research (Contact: rohit.research@agentify.ai)"
REFERER = "https://agentify.ai/research"

# Overpass API mirrors for high reliability
OVERPASS_SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.osm.ch/api/interpreter"
]

EMAIL_REGEX = r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    logger.info("🚀 Starting Agentify Multi-Agent Backend...")
    scheduler.start()
    logger.info("✅ Backend started")
    yield
    # Shutdown logic
    scheduler.shutdown()
    logger.info("👋 Goodbye!")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = BackgroundScheduler()

# Demo scheduler jobs
def poll_replies():
    pass

def check_and_send_scheduled_campaigns():
    pass

scheduler.add_job(poll_replies, 'interval', minutes=5)
scheduler.add_job(check_and_send_scheduled_campaigns, 'interval', seconds=30)

@app.get("/")
def read_root():
    return {"status": "online", "agent": "Agentify Hub"}

@app.post("/generate")
def generate_website(request: WebsiteGenerateRequest):
    try:
        result = generate_code_from_prompt(request.prompt, request.theme)
        return result
    except Exception as e:
        logger.error(f"Website generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- SOCIAL MEDIA ENDPOINTS ---

@app.post("/social/generate")
def generate_social(request: SocialGenerateRequest):
    try:
        content = generate_social_content(
            request.theme, 
            request.topic, 
            request.description, 
            request.platforms
        )
        if "error" in content:
            return {"success": False, "detail": content["error"]}
        return {"success": True, "content": content}
    except Exception as e:
        logger.error(f"Social generate error: {str(e)}")
        return {"success": False, "detail": str(e)}

@app.post("/social/generate-image")
def generate_social_image(request: SocialImageRequest):
    try:
        # Surgically handle generation with NO CRASHING
        img, error = generate_image_from_prompt(request.prompt)
        
        if error:
            logger.error(f"Image generate error: {error}")
            return {"success": False, "detail": error}
            
        if not img:
            return {"success": False, "detail": "Image generation failed: No image output."}

        # Convert to base64
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()

        return {"success": True, "image_base64": img_str}
    except Exception as e:
        msg = str(e)
        logger.error(f"Image generation crash: {msg}")
        return {"success": False, "detail": msg}

@app.post("/social/post")
def post_social(request: SocialPostRequest):
    try:
        img = None
        if request.image_base64:
            if "base64," in request.image_base64:
                request.image_base64 = request.image_base64.split("base64,")[1]
            img = Image.open(io.BytesIO(base64.b64decode(request.image_base64)))

        results = []
        for platform in request.platforms:
            res = post_content(
                platform=platform,
                caption=request.caption,
                image=img,
                tw_api_key=request.tw_api_key,
                tw_api_secret=request.tw_api_secret,
                tw_access_token=request.tw_access_token,
                tw_access_secret=request.tw_access_secret,
                ig_username=request.ig_username,
                ig_password=request.ig_password
            )
            results.append({"platform": platform, "result": res})
        
        return {"success": True, "results": results}
    except Exception as e:
        logger.error(f"Post social error: {str(e)}")
        return {"success": False, "detail": str(e)}

# --- EMAIL ENDPOINTS ---

@app.post("/email/generate")
def generate_email(request: EmailGenerateRequest):
    try:
        result = generate_complete_email(
            request.subject, 
            request.mail_description, 
            request.receiver_name, 
            request.sender_name
        )
        return result
    except Exception as e:
        logger.error(f"Email generate error: {str(e)}")
        return {"success": False, "detail": str(e)}

@app.post("/email/send")
def send_email(request: EmailSendRequest):
    try:
        scheduled_dt = None
        if request.scheduled_time:
            scheduled_dt = datetime.fromisoformat(request.scheduled_time.replace('Z', '+00:00'))

        if scheduled_dt and scheduled_dt > datetime.now():
            result = schedule_email(
                request.to_emails, 
                request.subject, 
                request.body, 
                scheduled_dt, 
                request.sender_name,
                request.include_response_buttons
            )
        else:
            result = send_email_now(
                request.to_emails, 
                request.subject, 
                request.body, 
                request.sender_name,
                request.include_response_buttons
            )
        return {"success": True, **result}
    except Exception as e:
        logger.error(f"Email send error: {str(e)}")
        return {"success": False, "detail": str(e)}

@app.post("/upload-email-csv")
async def upload_csv(file: UploadFile = File(...)):
    try:
        df = pd.read_csv(file.file)
        results = email_extractor.extract_emails(df)
        
        cache_id = str(uuid.uuid4())
        csv_cache[cache_id] = results
        
        return {
            "success": True, 
            "cache_id": cache_id,
            **results
        }
    except Exception as e:
        logger.error(f"CSV upload error: {str(e)}")
        return {"success": False, "error": str(e)}

@app.post("/load-audience-csv/{group_key}")
def load_audience(group_key: str):
    try:
        file_path = f"audience_csv/{group_key}.csv"
        if not os.path.exists(file_path):
            return {"success": False, "error": f"Audience group {group_key} not found"}
            
        df = pd.read_csv(file_path)
        results = email_extractor.extract_emails(df)
        
        cache_id = str(uuid.uuid4())
        csv_cache[cache_id] = results
        
        return {
            "success": True, 
            "cache_id": cache_id,
            **results
        }
    except Exception as e:
        logger.error(f"Audience load error: {str(e)}")
        return {"success": False, "error": str(e)}

@app.post("/send-bulk-email")
def send_bulk(request: BulkEmailRequest):
    try:
        if request.cache_id not in csv_cache:
            return {"success": False, "error": "Invalid or expired session"}
            
        data = csv_cache[request.cache_id]
        to_emails = [pair["email"] for pair in data["email_name_pairs"]]
        
        scheduled_dt = None
        if request.scheduled_time:
            scheduled_dt = datetime.fromisoformat(request.scheduled_time.replace('Z', '+00:00'))

        if scheduled_dt and scheduled_dt > datetime.now():
            result = schedule_email(
                to_emails, 
                request.subject, 
                request.body, 
                scheduled_dt,
                include_response_buttons=request.include_response_buttons
            )
            return {"success": True, "status": "scheduled", **result}
        else:
            result = send_email_now(
                to_emails, 
                request.subject, 
                request.body,
                include_response_buttons=request.include_response_buttons
            )
            return {"success": True, "status": "sent", **result}
            
    except Exception as e:
        logger.error(f"Bulk send error: {str(e)}")
        return {"success": False, "error": str(e)}

@app.get("/track-response", response_class=HTMLResponse)
async def track_response(email: str, subject: str, response: str):
    """
    Endpoint hit by the email response buttons ("Yes, I'm Interested" or "Not Interested").
    Logs the response to the Google Sheet and displays a thank you page.
    """
    try:
        # Decode the URL params
        subject_clean = urllib.parse.unquote(subject)
        email_clean = urllib.parse.unquote(email)
        
        # Record the response in Google Sheet
        logger.info(f"Recording response: {response} from {email_clean} for {subject_clean}")
        record_email_response(email_clean, subject_clean, response)
        
        color = "#10b981" if response.lower().startswith("yes") else "#6b7280"
        icon = "✓" if response.lower().startswith("yes") else "ℹ"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Response Recorded</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    background-color: #f3f4f6;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }}
                .card {{
                    background: white;
                    padding: 48px 32px;
                    border-radius: 20px;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                    text-align: center;
                    max-width: 440px;
                    width: 90%;
                    border: 1px solid #e5e7eb;
                }}
                .icon-container {{
                    display: inline-flex;
                    justify-content: center;
                    align-items: center;
                    width: 72px;
                    height: 72px;
                    background-color: {color}15;
                    color: {color};
                    border-radius: 50%;
                    font-size: 36px;
                    margin-bottom: 24px;
                }}
                h1 {{
                    color: #111827;
                    font-size: 26px;
                    margin-bottom: 12px;
                    margin-top: 0;
                    font-weight: 800;
                    letter-spacing: -0.025em;
                }}
                p {{
                    color: #4b5563;
                    line-height: 1.6;
                    margin-bottom: 24px;
                    font-size: 16px;
                }}
                .response-chip {{
                    display: inline-block;
                    padding: 6px 16px;
                    background-color: {color}10;
                    color: {color};
                    border-radius: 9999px;
                    font-weight: 600;
                    font-size: 14px;
                    margin-bottom: 24px;
                    border: 1px solid {color}30;
                }}
                .footer {{
                    color: #9ca3af;
                    font-size: 14px;
                    margin-top: 40px;
                    border-top: 1px solid #f3f4f6;
                    padding-top: 24px;
                }}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="icon-container">{icon}</div>
                <h1>Response Recorded</h1>
                <div class="response-chip">{response}</div>
                <p>Thank you for letting us know! Your response has been successfully recorded in our centralized sheet.</p>
                {"<p>We've noted your interest and will be in touch with you shortly regarding <strong>" + subject_clean + "</strong>.</p>" if response.lower().startswith("yes") else ""}
                <div class="footer">
                    <strong>Powered by Agentify</strong>
                </div>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        logger.error(f"Error tracking response: {e}")
        return HTMLResponse(content="<h1>An error occurred while recording your response.</h1>", status_code=500)

# --- LEAD FINDER ENDPOINTS ---

async def get_area_id(city: str):
    """Convert city name to OSM area ID using Nominatim with Photon fallback."""
    nominatim_url = f"https://nominatim.openstreetmap.org/search?q={city}&format=json&limit=1"
    headers = {
        "User-Agent": USER_AGENT,
        "Referer": REFERER,
        "Accept-Language": "en-US,en;q=0.9"
    }
    
    async with httpx.AsyncClient(headers=headers) as client:
        try:
            logger.info(f"Attempting Nominatim lookup for: {city}")
            response = await client.get(nominatim_url, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                if data:
                    return data[0].get("display_name")
            elif response.status_code == 403:
                logger.error("Nominatim 403: Forbidden. Usage limit exceeded or User-Agent blocked.")
            
            logger.warning(f"Nominatim returned {response.status_code}. Falling back to Photon.")
        except Exception as e:
            logger.error(f"Nominatim error: {e}. Falling back to Photon.")

        # Fallback to Photon
        photon_url = f"https://photon.komoot.io/api/?q={city}&limit=1"
        try:
            logger.info(f"Attempting Photon lookup for: {city}")
            response = await client.get(photon_url, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            if data["features"]:
                props = data["features"][0]["properties"]
                name = props.get("name", "")
                city_name = props.get("city", props.get("state", ""))
                return f"{name}, {city_name}"
            
            raise HTTPException(status_code=404, detail=f"Location '{city}' not found.")
        except Exception as e:
            logger.error(f"Photon error: {e}")
            raise HTTPException(status_code=500, detail="Global Geocoding Network failure.")

async def extract_emails_from_url(url: str) -> List[str]:
    """Crawl a website and extract emails using regex."""
    if not url:
        return []
    
    if not url.startswith("http"):
        url = "http://" + url

    async with httpx.AsyncClient(headers={"User-Agent": USER_AGENT}, follow_redirects=True) as client:
        try:
            response = await client.get(url, timeout=15.0)
            if response.status_code == 200:
                emails = re.findall(EMAIL_REGEX, response.text)
                return list(set(emails)) # Unique emails
        except Exception as e:
            logger.warning(f"Could not crawl {url}: {e}")
    return []

@app.get("/generate-leads", response_model=LeadsResponse)
async def generate_leads(keyword: str, city: str):
    full_address = await get_area_id(city)
    base_city = full_address.split(',')[0].strip()
    logger.info(f"Searching for {keyword} in simplified area: {base_city}")

    osm_keyword = keyword.lower()
    
    industry_tags = {
        "dentist": [("healthcare", "dentist"), ("amenity", "dentist")],
        "real estate": [("office", "estate_agent")],
        "interior designer": [("office", "architect"), ("shop", "interior_decoration")],
        "gym": [("leisure", "fitness_centre")],
        "salon": [("shop", "hairdresser"), ("shop", "beauty")],
        "restaurant": [("amenity", "restaurant")],
        "digital marketing": [("office", "marketing"), ("office", "advertising")],
        "marketing": [("office", "marketing"), ("office", "advertising")],
        "finance": [("office", "accountant"), ("office", "financial")],
        "startup": [("office", "it"), ("office", "company")],
        "hospital": [("amenity", "hospital"), ("healthcare", "hospital")],
        "clinic": [("amenity", "clinic"), ("healthcare", "clinic")],
        "ecommerce": [("office", "it"), ("office", "company")],
        "edtech": [("office", "it"), ("office", "company")],
        "lawyer": [("office", "lawyer")],
        "architect": [("office", "architect")]
    }

    filters = ""
    for key, tags in industry_tags.items():
        if key in osm_keyword or osm_keyword in key:
            for tag_key, tag_val in tags:
                filters += f'      nwr["{tag_key}"="{tag_val}"](area.searchArea);\n'
            break
            
    if not filters:
        filters = f'      nwr["name"~"{keyword}",i](area.searchArea);\n'
    
    query = f"""
    [out:json][timeout:60];
    area["name"="{base_city}"]->.searchArea;
    (
{filters}
    );
    out center 100;
    """
    
    data = None
    async with httpx.AsyncClient(headers={"User-Agent": USER_AGENT}) as client:
        for server in OVERPASS_SERVERS:
            try:
                logger.info(f"Querying Overpass server: {server}")
                response = await client.post(server, data={"data": query}, timeout=40.0)
                if response.status_code == 200:
                    data = response.json()
                    break
                logger.warning(f"Server {server} returned {response.status_code}. Trying next mirror...")
            except Exception as e:
                logger.error(f"Error connecting to {server}: {e}")
                continue
    
    if not data:
        raise HTTPException(
            status_code=504, 
            detail="All Overpass mirrors are currently overloaded."
        )

    elements = data.get("elements", [])
    leads = []

    for element in elements:
        tags = element.get("tags", {})
        name = tags.get("name", "Unknown Business")
        phone = tags.get("phone") or tags.get("contact:phone")
        website = tags.get("website") or tags.get("contact:website")
        email = tags.get("email") or tags.get("contact:email")
        
        leads.append(Lead(
            name=name,
            phone=phone,
            website=website,
            email=email,
            crawled_emails=[]
        ))

    crawl_tasks = []
    for lead in leads:
        if lead.website:
            crawl_tasks.append(extract_emails_from_url(lead.website))
        else:
            crawl_tasks.append(asyncio.sleep(0, result=[]))

    crawled_results = await asyncio.gather(*crawl_tasks)
    
    for lead, crawled_emails in zip(leads, crawled_results):
        lead.crawled_emails = crawled_emails
    
    verified_leads = [
        lead for lead in leads 
        if lead.email or (lead.crawled_emails and len(lead.crawled_emails) > 0)
    ]

    return LeadsResponse(total_leads=len(verified_leads), leads=verified_leads)

from PIL import Image

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)