"""CSV Email Extractor Agent with Name Support"""
import pandas as pd
import re
import logging
from typing import Dict, List, Tuple


logger = logging.getLogger(__name__)


class SimpleEmailExtractor:
    """Extracts emails and names from CSV"""
    EMAIL_PATTERN = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    NAME_KEYWORDS = ['name', 'full_name', 'fullname', 'recipient', 'contact_name', 'first_name', 'person', 'recipient_name']
    
    def extract_emails(self, df: pd.DataFrame) -> Dict:
        """Extract emails and names from CSV"""
        logger.info("🔍 Extracting emails and names from CSV...")
        
        # Find email column
        email_column = self._find_email_column(df)
        if not email_column:
            logger.error("❌ No email column found")
            return {
                "valid_emails": [],
                "invalid_emails": [],
                "total_valid": 0,
                "total_invalid": 0,
                "email_name_pairs": []
            }
        
        # Find name column
        name_column = self._find_name_column(df)
        
        logger.info(f"📧 Email column: {email_column}")
        logger.info(f"👤 Name column: {name_column if name_column else 'Not found'}")
        
        valid_emails = []
        invalid_emails = []
        email_name_pairs = []
        
        # Extract email and name pairs
        for idx, row in df.iterrows():
            email = str(row[email_column]).strip() if email_column in df.columns else None
            name = str(row[name_column]).strip() if name_column and name_column in df.columns else "Friend"
            
            if email and self._is_valid_email(email):
                valid_emails.append(email)
                email_name_pairs.append({
                    "email": email,
                    "name": name if name and name != 'nan' else "Friend"
                })
            elif email:
                invalid_emails.append(email)
        
        # Remove duplicates
        seen = set()
        unique_pairs = []
        for pair in email_name_pairs:
            if pair["email"] not in seen:
                seen.add(pair["email"])
                unique_pairs.append(pair)
        
        valid_emails = list(dict.fromkeys(valid_emails))
        invalid_emails = list(dict.fromkeys(invalid_emails))
        
        logger.info(f"✅ Found {len(valid_emails)} valid emails")
        logger.info(f"✅ Found {len(unique_pairs)} email-name pairs")
        logger.info(f"📝 Sample pairs: {unique_pairs[:3]}")
        
        return {
            "valid_emails": valid_emails,
            "invalid_emails": invalid_emails,
            "total_valid": len(valid_emails),
            "total_invalid": len(invalid_emails),
            "email_name_pairs": unique_pairs
        }
    
    def _find_email_column(self, df: pd.DataFrame) -> str:
        """Find column containing emails"""
        for col in df.columns:
            col_lower = col.lower().strip()
            if 'email' in col_lower or 'mail' in col_lower or col_lower == 'e-mail':
                return col
        
        # Check by content
        for col in df.columns:
            sample = df[col].dropna().astype(str).head(10)
            valid_emails = sum(1 for value in sample if self._is_valid_email(value))
            if len(sample) > 0 and valid_emails / len(sample) > 0.7:
                return col
        
        return None
    
    def _find_name_column(self, df: pd.DataFrame) -> str:
        """Find column containing names"""
        for col in df.columns:
            col_lower = col.lower().strip()
            if any(keyword in col_lower for keyword in self.NAME_KEYWORDS):
                return col
        
        # Default to first column if no name column found
        if len(df.columns) > 1:
            return df.columns[0]
        
        return None
    
    def _is_valid_email(self, email: str) -> bool:
        """Validate email format"""
        return re.match(self.EMAIL_PATTERN, email) is not None
