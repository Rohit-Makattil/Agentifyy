import os
import json
import logging
from datetime import datetime
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

# Scopes needed for Google Sheets API
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

def get_sheets_service():
    """Returns an authenticated Google Sheets service object."""
    credentials_path = os.getenv("GOOGLE_SHEETS_CREDENTIALS_PATH", "./service_account.json")
    
    if not os.path.exists(credentials_path):
        logger.error(f"Credentials file not found at {credentials_path}")
        return None
        
    try:
        credentials = Credentials.from_service_account_file(
            credentials_path, scopes=SCOPES
        )
        service = build('sheets', 'v4', credentials=credentials)
        return service
    except Exception as e:
        logger.error(f"Failed to initialize Google Sheets service: {e}")
        return None

def record_email_response(email: str, subject: str, response: str) -> bool:
    """
    Appends a new row to the tracking Google Sheet with the response data.
    """
    sheet_id = os.getenv("SHEET_ID")
    if not sheet_id:
        logger.error("SHEET_ID is not set in environment variables.")
        return False
        
    service = get_sheets_service()
    if not service:
        return False
        
    try:
        # Get current timestamp in a nice format
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Prepare the row data
        values = [
            [timestamp, email, subject, response]
        ]
        
        body = {
            'values': values
        }
        
        # We append to 'Responses'.
        range_name = 'Responses!A:D'
        
        result = service.spreadsheets().values().append(
            spreadsheetId=sheet_id,
            range=range_name,
            valueInputOption='USER_ENTERED',
            insertDataOption='INSERT_ROWS',
            body=body
        ).execute()
        
        logger.info(f"Successfully recorded response '{response}' for {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to append to Google Sheet: {e}")
        return False
