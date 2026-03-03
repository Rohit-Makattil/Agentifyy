# social_post_agent.py
# Requirements: pip install google-generativeai requests pillow python-dotenv tweepy playwright gradio_client
import os
import sys
import json
import base64
import tempfile
import subprocess
import time
from io import BytesIO
import requests
from PIL import Image
from dotenv import load_dotenv
import google.generativeai as genai
from gradio_client import Client as GradioClient

load_dotenv(override=True)

# ---------------- CONFIG ----------------
GEMINI_API_KEY      = os.getenv("GEMINI_API_KEY")
HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY")

TWITTER_API_KEY       = os.getenv("TWITTER_API_KEY", "")
TWITTER_API_SECRET    = os.getenv("TWITTER_API_SECRET", "")
TWITTER_ACCESS_TOKEN  = os.getenv("TWITTER_ACCESS_TOKEN", "")
TWITTER_ACCESS_SECRET = os.getenv("TWITTER_ACCESS_SECRET", "")

INSTAGRAM_USERNAME = os.getenv("INSTAGRAM_USERNAME", "")
INSTAGRAM_PASSWORD = os.getenv("INSTAGRAM_PASSWORD", "")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

MODEL_TEXT  = "gemini-2.5-flash"
MODEL_IMAGE = "gemini-2.5-flash-image"

# Path to instagram_poster.py
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_IG_POSTER  = os.path.join(_SCRIPT_DIR, "instagram_poster.py")


# ---------------- GEMINI HELPERS ----------------
def generate_social_content(theme: str, topic: str, description: str, platforms: list) -> dict:
    if not GEMINI_API_KEY:
        return {"error": "Missing GEMINI_API_KEY"}

    system_prompt = f"""You are a top-tier social media manager and content creator.
    Generate content for: {', '.join(platforms)}. Theme: {theme}, Topic: {topic}, Desc: {description}.
    Return JSON only with 'captions' (per platform) and 'image_prompt'.
    """
    try:
        model = genai.GenerativeModel(MODEL_TEXT)
        response = model.generate_content(system_prompt)
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        return json.loads(text)
    except Exception as e:
        return {"error": str(e)}


# ---------------- IMAGE GENERATION PROVIDERS ----------------

def _extract_path(result):
    """Surgically extract image path or URL from complex Gradio outputs."""
    try:
        if not result: return None
        # Handle tuple: ([{'image': '...', ...}], timestamp)
        if isinstance(result, tuple) and len(result) > 0:
            result = result[0]
        # Handle list: [{'image': '...', ...}]
        if isinstance(result, list) and len(result) > 0:
            result = result[0]
        # Handle dict: {'image': '...', ...}
        if isinstance(result, dict):
            if 'image' in result: return result['image']
            if 'path' in result: return result['path']
            if 'url' in result: return result['url']
        # Handle string directly
        if isinstance(result, str):
            return result
    except:
        pass
    return None

def _get_image(path_or_url):
    """Immediate retrieval from path or URL."""
    if not path_or_url or not isinstance(path_or_url, str):
        return None
    try:
        if path_or_url.startswith("http"):
            r = requests.get(path_or_url, timeout=30)
            return Image.open(BytesIO(r.content))
        if os.path.exists(path_or_url):
            return Image.open(path_or_url)
    except:
        pass
    return None

def generate_image_pollinations(prompt: str):
    """Fallback 1: Pollinations.ai"""
    try:
        clean_prompt = f"{prompt} --seed {int(time.time())}"
        url = f"https://image.pollinations.ai/prompt/{requests.utils.quote(clean_prompt)}"
        headers = {"User-Agent": "Mozilla/5.0"}
        resp = requests.get(url, headers=headers, timeout=20)
        if resp.status_code == 200:
            return Image.open(BytesIO(resp.content)), None
        return None, f"Pollinations error {resp.status_code}"
    except Exception as e:
        return None, f"Pollinations error: {str(e)}"

def generate_image_gradio(prompt: str):
    """Fallback 2: Gradio spaces"""
    # Try FLUX first
    try:
        client = GradioClient("black-forest-labs/FLUX.1-schnell")
        res = client.predict(prompt=prompt, seed=0, randomize_seed=True, width=1024, height=1024, num_inference_steps=4, api_name="/infer")
        img = _get_image(_extract_path(res))
        if img: return img, None
    except:
        pass
    
    # Try SDXL-Flash
    try:
        client = GradioClient("KingNish/SDXL-Flash")
        res = client.predict(prompt=prompt, negative_prompt="ugly, blurry", use_negative_prompt=True, seed=0, width=1024, height=1024, guidance_scale=3.0, num_inference_steps=8, randomize_seed=True, api_name="/run")
        img = _get_image(_extract_path(res))
        if img: return img, None
    except Exception as e:
        return None, f"Gradio error: {str(e)}"
    
    return None, "Gradio failed to return image"

def generate_image_gemini(prompt: str):
    """Fallback 3: Gemini"""
    if not GEMINI_API_KEY: return None, "No Gemini Key"
    try:
        model = genai.GenerativeModel(MODEL_IMAGE)
        resp = model.generate_content(prompt)
        for part in resp.candidates[0].content.parts:
            if hasattr(part, "inline_data") and part.inline_data:
                return Image.open(BytesIO(base64.b64decode(part.inline_data.data))), None
        return None, "Gemini: No image data"
    except Exception as e:
        return None, f"Gemini error: {str(e)}"

def generate_image_from_prompt(prompt: str):
    """Integrated chain with no crashing."""
    providers = [
        ("Pollinations", generate_image_pollinations),
        ("Gradio", generate_image_gradio),
        ("Gemini", generate_image_gemini)
    ]
    errors = []
    for name, func in providers:
        try:
            img, err = func(prompt)
            if img: return img, None
            errors.append(f"{name}: {err}")
        except Exception as ex:
            errors.append(f"{name} Crash: {str(ex)}")
    return None, " | ".join(errors)


# ---------------- TWITTER & INSTAGRAM ----------------

def post_to_twitter(caption, api_key="", api_secret="", access_token="", access_secret=""):
    try:
        import tweepy
        k = api_key or TWITTER_API_KEY
        s = api_secret or TWITTER_API_SECRET
        t = access_token or TWITTER_ACCESS_TOKEN
        as_ = access_secret or TWITTER_ACCESS_SECRET
        if not all([k, s, t, as_]): return {"success": False, "error": "Missing keys"}
        client = tweepy.Client(consumer_key=k, consumer_secret=s, access_token=t, access_token_secret=as_)
        resp = client.create_tweet(text=caption)
        return {"success": True, "tweet_id": resp.data["id"], "url": f"https://twitter.com/i/web/status/{resp.data['id']}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def post_to_instagram(caption, image, username="", password="", **kwargs):
    u = username or kwargs.get("ig_username") or INSTAGRAM_USERNAME
    p = password or kwargs.get("ig_password") or INSTAGRAM_PASSWORD
    if not u or not p: return {"success": False, "error": "Missing IG credentials"}
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False, dir=_SCRIPT_DIR) as tmp:
            tmp_path = tmp.name
            image.convert("RGB").save(tmp_path, "JPEG", quality=95)
        # Use sys.executable to ensure we use the same venv
        res = subprocess.run([sys.executable, _IG_POSTER, "--username", u, "--password", p, "--image", tmp_path, "--caption", caption], capture_output=True, text=True, timeout=120)
        if res.returncode == 0: return {"success": True, "output": res.stdout.strip()}
        return {"success": False, "error": res.stderr.strip() or res.stdout.strip()}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        if tmp_path and os.path.exists(tmp_path): os.remove(tmp_path)

def post_content(platform, caption, image=None, **kwargs):
    if platform == "twitter": return post_to_twitter(caption, **kwargs)
    if platform == "instagram":
        if not image: return {"success": False, "error": "IG requires image"}
        # Pass kwargs to post_to_instagram so it can extract ig_username/password
        return post_to_instagram(caption, image, **kwargs)
    return {"success": False, "error": f"Unknown platform: {platform}"}

if __name__ == "__main__":
    print("Social Agent Logic Ready.")
