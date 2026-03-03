import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

MODEL_TYPE = os.getenv("MODEL_TYPE", "gemini")  # default = gemini
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


# -------------------------------------------------------------
# ✅ Helper to wrap the user's prompt with clear instructions
# -------------------------------------------------------------
def prompt_with_instruction(user_prompt: str) -> str:
    return (
        "You are an expert frontend web developer. "
        "Generate clean, production-ready HTML, CSS, and JavaScript for a website. "
        "IMPORTANT: The design MUST reflect the theme specified (colors, fonts, style). "
        "Keep code concise but complete. Separate each file clearly:\n"
        "```index.html\n<!-- HTML -->\n```\n"
        "```style.css\n/* CSS */\n```\n"
        "```script.js\n// JS\n```\n\n"
        f"User prompt: {user_prompt}"
    )


# -------------------------------------------------------------
# ✅ OpenAI (optional) - only used if MODEL_TYPE=openai
# -------------------------------------------------------------
def call_openai(prompt: str) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    return response.choices[0].message.content


# -------------------------------------------------------------
# ✅ Gemini (default) - free tier via Google AI Studio
# -------------------------------------------------------------
import google.generativeai as genai

def get_latest_gemini_flash():
    # genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    # models = [m.name for m in genai.list_models() if "generateContent" in m.supported_generation_methods]
    # flash_models = [m for m in models if "flash" in m]
    # # Pick the latest or stable version
    # for m in ["models/gemini-2.5-flash", "models/gemini-2.0-flash-lite"]:
    #     if m in flash_models:
    #         return m
    return "gemini-2.5-flash"

def _stream_gemini(model, prompt: str) -> str:
    """Streams a Gemini model response and returns the full text."""
    response = model.generate_content(prompt, stream=True)
    full_text = ""
    for chunk in response:
        if chunk.text:
            full_text += chunk.text
    return full_text

def call_gemini(prompt: str) -> str:
    import google.generativeai as genai
    import concurrent.futures

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment.")
    genai.configure(api_key=api_key)

    # Try working models in order of preference
    models_to_try = [
        "models/gemini-2.5-flash",      # Working - primary
        "models/gemini-2.0-flash",      # Fallback
    ]

    last_error = None
    for model_name in models_to_try:
        try:
            print(f"Trying model: {model_name}")
            model = genai.GenerativeModel(model_name)
            # Use a thread with 120s timeout to prevent 504 Deadline Exceeded hanging forever
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(_stream_gemini, model, prompt)
                result = future.result(timeout=120)
            print(f"✅ Success with model: {model_name}")
            return result
        except concurrent.futures.TimeoutError:
            last_error = f"{model_name} timed out after 120s"
            print(f"⚠️ {last_error}, trying next model...")
            continue
        except Exception as e:
            err_str = str(e)
            # Only fall through to next model on timeout/deadline errors
            if "504" in err_str or "deadline" in err_str.lower() or "timed out" in err_str.lower():
                last_error = err_str
                print(f"⚠️ {model_name} deadline error, trying next model...")
                continue
            raise  # Re-raise all other errors (quota, auth, etc.)

    raise RuntimeError(f"All Gemini models failed. Last error: {last_error}")


# -------------------------------------------------------------
# ✅ Local Model (optional, placeholder for your fine-tuned model)
# -------------------------------------------------------------
def call_local_model(prompt: str) -> str:
    # You can later replace this with your own model
    return f"<p>This is a placeholder response for local model.</p>\nPrompt: {prompt}"


# -------------------------------------------------------------
# ✅ Main Function to Generate Website Code
# -------------------------------------------------------------
def generate_code_from_prompt(user_prompt: str) -> dict:
    full_prompt = prompt_with_instruction(user_prompt)

    if MODEL_TYPE == "openai":
        response_text = call_openai(full_prompt)
    elif MODEL_TYPE == "local":
        response_text = call_local_model(full_prompt)
    else:
        response_text = call_gemini(full_prompt)

    files = parse_files_from_model_text(response_text)
    return {'files': files, 'raw': response_text}


# -------------------------------------------------------------
# ✅ Extract HTML, CSS, JS from the model's output
# -------------------------------------------------------------
def parse_files_from_model_text(output_text: str) -> dict:
    files = {}

    import re
    html_match = re.search(r"```index\.html\s*([\s\S]*?)```", output_text)
    css_match = re.search(r"```style\.css\s*([\s\S]*?)```", output_text)
    js_match = re.search(r"```script\.js\s*([\s\S]*?)```", output_text)

    if html_match:
        files["index.html"] = html_match.group(1).strip()
    if css_match:
        files["style.css"] = css_match.group(1).strip()
    if js_match:
        files["script.js"] = js_match.group(1).strip()
    
    # Fallback: if no code blocks found, check if raw text looks like HTML
    if not files and ("<html" in output_text.lower() or "<!doctype html" in output_text.lower()):
        files["index.html"] = output_text.strip()
            
    return files


# -------------------------------------------------------------
# ✅ Example usage (for local testing)
# -------------------------------------------------------------
if __name__ == "__main__":
    example_prompt = "Create a landing page for a travel website with a header, hero section, and footer."
    result = generate_code_from_prompt(example_prompt)
    print("=== index.html ===\n", result['files']["index.html"])
    print("\n=== style.css ===\n", result['files']["style.css"])
    print("\n=== script.js ===\n", result['files']["script.js"])
