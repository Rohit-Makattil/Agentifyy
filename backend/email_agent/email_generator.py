import os
import google.generativeai as genai 
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def generate_complete_email(subject: str, mail_description: str, receiver_name: str = "Recipient", sender_name: str = "Your Name") -> dict:
    """
    Generate a complete professional email using Gemini API
    
    Args:
        subject: Email subject line
        mail_description: Description of what the email is about (replaces body_template)
        receiver_name: Name of the recipient
        sender_name: Name of the sender
        
    Returns:
        Dictionary with complete email details
    """
    prompt = f"""
    You are a professional email writer. Create a complete, well-structured, and professional email based on the following information:
    
    Subject: {subject}
    Situation/Context: {mail_description}
    Recipient: {receiver_name}
    Sender: {sender_name}
    
    Write a complete email with:
    1. Professional greeting: "Dear {receiver_name},"
    2. Opening paragraph: Introduce the purpose clearly
    3. Main body: Explain the situation mentioned in "{mail_description}" in a professional, detailed manner
    4. Include relevant details, show empathy, and maintain a respectful tone
    5. Closing paragraph: Express gratitude or hope for understanding/approval
    6. Professional sign-off: Use "Best regards," "Sincerely," or "Warm regards,"
    7. Signature: {sender_name}
    
    Important guidelines:
    - Make it 200-300 words
    - Use professional, polite language
    - Add appropriate emotional tone based on the context
    - Include line breaks between paragraphs for readability
    - Do not use bullet points or lists
    - Write in a warm, human tone while maintaining professionalism
    - Expand on the context naturally with relevant details
    
    Return ONLY the complete email content with proper formatting.
    """
    
    try:
        # Use Gemini 2.5 Flash model
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        generation_config = {
            "temperature": 0.7,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 1024,
        }
        
        response = model.generate_content(
            prompt,
            generation_config=generation_config
        )
        
        generated_email = response.text.strip()
        
        logger.info(f"✅ Email generated successfully using Gemini API")
        
        return {
            "success": True,
            "email_body": generated_email,
            "subject": subject,
            "preview_html": format_email_preview(generated_email, subject, receiver_name, sender_name)
        }
        
    except Exception as e:
        logger.error(f"❌ Email generation failed: {str(e)}")
        
        # Enhanced fallback template
        fallback_email = f"""Dear {receiver_name},

I am writing to inform you about the following matter: {mail_description}

I kindly request your understanding and consideration regarding this situation. I would greatly appreciate your support and approval.

Please feel free to reach out if you need any additional information or clarification.

Thank you for your time and consideration.

Best regards,
{sender_name}"""
        
        return {
            "success": True,
            "email_body": fallback_email,
            "subject": subject,
            "preview_html": format_email_preview(fallback_email, subject, receiver_name, sender_name),
            "warning": "Using fallback template due to API error"
        }

def format_email_preview(email_body: str, subject: str, receiver_name: str, sender_name: str) -> str:
    """
    Format email for HTML preview display with professional template
    """
    # Convert plain text to HTML with proper formatting
    formatted_body = email_body.replace('\n\n', '</p><p style="margin: 15px 0; line-height: 1.8; color: #333;">')
    formatted_body = formatted_body.replace('\n', '<br>')
    
    html_preview = f"""
    <div style="font-family: 'Arial', 'Segoe UI', sans-serif; max-width: 700px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
        <!-- Email Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 28px; text-align: center;">
            <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; margin-bottom: 12px;">
                <span style="color: white; font-size: 12px; font-weight: 600; letter-spacing: 1px;">PREVIEW MODE</span>
            </div>
            <h2 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">
                📧 Email Preview
            </h2>
        </div>
        
        <!-- Email Metadata -->
        <div style="padding: 24px 32px; background: #f8f9fa; border-bottom: 3px solid #e9ecef;">
            <div style="margin-bottom: 10px;">
                <strong style="color: #495057; font-size: 14px; font-weight: 600;">Subject:</strong>
                <span style="color: #212529; font-size: 15px; margin-left: 10px; font-weight: 500;">{subject}</span>
            </div>
            <div style="margin-bottom: 10px;">
                <strong style="color: #495057; font-size: 14px; font-weight: 600;">To:</strong>
                <span style="color: #212529; font-size: 14px; margin-left: 10px;">{receiver_name}</span>
            </div>
            <div>
                <strong style="color: #495057; font-size: 14px; font-weight: 600;">From:</strong>
                <span style="color: #212529; font-size: 14px; margin-left: 10px;">{sender_name}</span>
            </div>
        </div>
        
        <!-- Email Body -->
        <div style="padding: 35px 32px; background: #ffffff;">
            <div style="color: #333; line-height: 1.8; font-size: 15px;">
                <p style="margin: 15px 0; line-height: 1.8; color: #333;">{formatted_body}</p>
            </div>
        </div>
        
        <!-- Email Footer -->
        <div style="padding: 24px 32px; background: #f8f9fa; border-top: 3px solid #e9ecef; text-align: center;">
            <p style="margin: 0; color: #6c757d; font-size: 13px; font-weight: 500;">
                ✨ Powered by Agentify AI | Professional Email Automation
            </p>
        </div>
    </div>
    """
    return html_preview
