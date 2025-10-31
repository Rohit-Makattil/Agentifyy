import os
import logging
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

def poll_replies(sent_subjects: list):
    """
    Poll Gmail for replies to sent emails
    
    Args:
        sent_subjects: List of subjects to check for replies
    """
    try:
        token_path = os.getenv("GMAIL_TOKEN_PATH", "./token.json")
        
        if not os.path.exists(token_path):
            logger.warning("Gmail token not found. Skipping reply polling.")
            return
        
        creds = Credentials.from_authorized_user_file(token_path, [
            'https://www.googleapis.com/auth/gmail.readonly'
        ])
        
        service = build('gmail', 'v1', credentials=creds)
        
        # Search for replies
        for subject in sent_subjects[-10:]:  # Check last 10 subjects
            query = f'subject:Re: {subject}'
            results = service.users().messages().list(
                userId='me',
                q=query,
                maxResults=5
            ).execute()
            
            messages = results.get('messages', [])
            if messages:
                logger.info(f"Found {len(messages)} replies for: {subject}")
                # Process replies here (optional)
        
    except Exception as e:
        logger.error(f"Reply polling failed: {str(e)}")
