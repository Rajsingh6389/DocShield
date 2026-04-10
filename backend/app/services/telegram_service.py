import os
import asyncio
import re
from typing import Optional, Dict, Any
try:
    from telethon import TelegramClient, events
except ImportError:
    TelegramClient = None
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

class TelegramIntelService:
    def __init__(self):
        self.api_id = os.getenv("TG_API_ID")
        self.api_hash = os.getenv("TG_API_HASH")
        # Ensure data directory exists for session
        os.makedirs("data", exist_ok=True)
        self.session_path = os.path.join("data", "docshield_session")
        self.target_bot = "@Shnuzzi_bot"
        self.client: Optional[TelegramClient] = None

    async def _ensure_client(self):
        if not TelegramClient:
            logger.error("Telethon not installed. Use 'pip install telethon'.")
            return False
            
        if not self.api_id or not self.api_hash:
            logger.error("Missing credentials in .env: TG_API_ID or TG_API_HASH")
            return False
        
        try:
            if self.client is None:
                logger.info(f"Connecting to Telegram (Session: {self.session_path})...")
                self.client = TelegramClient(self.session_path, int(self.api_id), self.api_hash)
                await self.client.connect()
                
            if not await self.client.is_user_authorized():
                logger.error("NOT_AUTHORIZED: Please run 'python scripts/tg_login.py' to login.")
                return False
                
            return True
        except Exception as e:
            logger.error(f"TELEGRAM_CONNECTION_ERROR: {str(e)}")
            return False

    def _parse_bot_response(self, text: str) -> Dict[str, Any]:
        """Parses the unstructured response from @Shnuzzi_bot into structured data."""
        # Clean the text slightly for easier parsing but keep the original for raw_text
        clean_text = text.replace("**", "").replace("`", "").strip()

        result = {
            "name": "N/A",
            "father_name": "N/A",
            "phones": [],
            "passport": "N/A",
            "region": "N/A",
            "address": "N/A",
            "addresses": [],
            "nickname": "N/A",
            "email": "N/A",
            "description": "N/A",
            "raw_text": text
        }
        
        if not text:
            return result
            
        # Extract preamble/description (everything before the first known icon or field label)
        desc_match = re.search(r"^(.*?)(?=\s*(?:📞|👤|👨|🃏|🗺️|🏘️|🏷️|📧|Telephone:|Full name:|Passport|Document|Region:|Adres:|Nickname:|Email:))", clean_text, re.DOTALL | re.IGNORECASE)
        if desc_match:
            result["description"] = desc_match.group(1).strip()

        # Extract Full Name (👤)
        name_match = re.search(r"(?:👤)?\s*Full name:\s*(.*)", clean_text, re.IGNORECASE)
        if name_match: result["name"] = name_match.group(1).strip()
        
        # Extract Father's Name (👨)
        father_match = re.search(r"(?:👨)?\s*(?:The )?name of the father:\s*(.*)", clean_text, re.IGNORECASE)
        if father_match: result["father_name"] = father_match.group(1).strip()
        
        # Extract Phones (📞)
        phone_matches = re.findall(r"(?:📞)?\s*Telephone:\s*(\d+)", clean_text, re.IGNORECASE)
        if phone_matches: result["phones"] = list(dict.fromkeys(phone_matches)) # Unique phones, keep order
        
        # Extract Passport / Document Number (🃏)
        doc_match = re.search(r"(?:🃏)?\s*(?:Passport|Document) number:\s*(.*)", clean_text, re.IGNORECASE)
        if doc_match: result["passport"] = doc_match.group(1).strip()
        
        # Extract Region (🗺️)
        region_match = re.search(r"(?:🗺️)?\s*Region:\s*(.*)", clean_text, re.IGNORECASE)
        if region_match: result["region"] = region_match.group(1).strip()

        # Extract Nickname (🏷️)
        nick_match = re.search(r"(?:🏷️)?\s*Nickname:\s*(.*)", clean_text, re.IGNORECASE)
        if nick_match: result["nickname"] = nick_match.group(1).strip()
        
        # Extract Email (📧)
        email_match = re.search(r"(?:📧)?\s*Email:\s*(.*)", clean_text, re.IGNORECASE)
        if email_match: result["email"] = email_match.group(1).strip()
        
        # Extract Address (🏘️ Adres:) - handle multi-line and multiple addresses
        address_matches = re.findall(r"(?:🏘️)?\s*Adres:\s*(.*?)(?=\s*(?:📞|👤|👨|🃏|🗺️|🏘️|🏷️|📧|Telephone:|Full name:|Passport|Document|Region:|Adres:|Nickname:|Email:|$))", clean_text, re.DOTALL | re.IGNORECASE)
        if address_matches: 
            # Clean up newlines and extra spaces
            cleaned_addresses = [re.sub(r'\s+', ' ', a.strip()) for a in address_matches if a.strip()]
            result["addresses"] = list(dict.fromkeys(cleaned_addresses))
            result["address"] = " | ".join(result["addresses"])
        
        return result

    async def get_phone_intel(self, phone: str) -> Optional[Dict[str, Any]]:
        """
        Sends a phone number to the target bot and waits for a response.
        Detects reply by comparing message IDs (more reliable than timestamps).
        Returns a structured dictionary or None if anything fails.
        """
        if not await self._ensure_client():
            return None

        try:
            logger.info(f"Requesting intel for {phone} from {self.target_bot}...")

            # Record the ID of our sent message so we can detect replies with a higher ID
            sent_msg = await self.client.send_message(self.target_bot, phone)
            sent_msg_id = sent_msg.id
            logger.info(f"Sent message ID: {sent_msg_id}")

            # Poll up to 45 seconds for a fresh bot reply
            for attempt in range(45):
                await asyncio.sleep(1)
                messages = await self.client.get_messages(self.target_bot, limit=10)

                logger.debug(f"[Poll {attempt+1}] Got {len(messages)} messages from chat")
                for msg in messages:
                    logger.debug(
                        f"  msg id={msg.id} out={msg.out} "
                        f"has_text={bool(msg.text)} has_doc={bool(msg.document)} "
                        f"text_preview={repr(msg.text[:60]) if msg.text else None}"
                    )

                    # Skip our own outgoing messages
                    if msg.out:
                        continue

                    # Only accept messages that arrived AFTER we sent our query
                    if msg.id <= sent_msg_id:
                        continue

                    # Accept any bot reply (text or document)
                    if msg.text or msg.document:
                        logger.success(f"Received intel from {self.target_bot} (attempt {attempt+1}, msg_id={msg.id})")

                        text_content = msg.text or ""
                        logger.info(f"--- RAW BOT RESPONSE ---\n{text_content}\n------------------------")
                        structured = self._parse_bot_response(text_content)

                        # If there's an HTML file attached, download it as a report
                        if msg.document and msg.document.mime_type == "text/html":
                            try:
                                buffer = await self.client.download_media(msg.document, bytes)
                                structured["html_report"] = buffer.decode('utf-8', errors='ignore')
                                logger.info("HTML report downloaded from bot attachment.")
                            except Exception as dl_err:
                                logger.warning(f"Failed to download HTML report: {dl_err}")

                        return structured

            logger.error(f"Timeout: {self.target_bot} did not respond in time after 45s.")
            return None

        except Exception as e:
            logger.error(f"Telegram communication error: {e}")
            return None

# Global instance for use in routes
telegram_intel = TelegramIntelService()