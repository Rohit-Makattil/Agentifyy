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
        "Generate production-ready HTML, CSS, and JavaScript code for a website "
        "based strictly on the user's description. "
        "Ensure clean formatting and separate sections for each file. "
        "Output format example:\n"
        "```index.html\n<!-- HTML code -->\n```\n"
        "```style.css\n/* CSS code */\n```\n"
        "```script.js\n// JS code\n```\n\n"
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
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    models = [m.name for m in genai.list_models() if "generateContent" in m.supported_generation_methods]
    flash_models = [m for m in models if "flash" in m]
    # Pick the latest or stable version
    for m in ["models/gemini-1.5-flash", "models/gemini-flash-latest"]:  # Updated to valid models (assuming typo in original)
        if m in flash_models:
            return m
    return flash_models[0] if flash_models else "models/gemini-1.5-flash"

def call_gemini(prompt: str) -> str:
    import google.generativeai as genai
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment.")
    genai.configure(api_key=api_key)
    model_name = get_latest_gemini_flash()
    model = genai.GenerativeModel(model_name)
    response = model.generate_content(prompt)
    return response.text


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
