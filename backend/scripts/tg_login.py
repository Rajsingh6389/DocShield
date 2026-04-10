import os
import asyncio
from telethon import TelegramClient
from dotenv import load_dotenv
import sys

# Add the current directory to path so we can import app if needed
sys.path.append(os.getcwd())

load_dotenv()

async def main():
    print("=== Telegram Login Utility ===")
    api_id = os.getenv("TG_API_ID")
    api_hash = os.getenv("TG_API_HASH")
    
    if not api_id or not api_hash:
        print("ERROR: Missing credentials in .env: TG_API_ID or TG_API_HASH")
        print("Please ensure your .env file has these values from https://my.telegram.org")
        return

    # Match the session path used in TelegramIntelService
    os.makedirs("data", exist_ok=True)
    session_path = os.path.join("data", "docshield_session")
    
    print(f"Connecting to Telegram (Session: {session_path})...")
    
    try:
        client = TelegramClient(session_path, int(api_id), api_hash)
        
        # client.start() will prompt for phone number and code if not authorized
        await client.start()
        
        if await client.is_user_authorized():
            print("\nSUCCESS: Successfully authorized!")
            me = await client.get_me()
            print(f"Logged in as: {me.first_name} (@{me.username})")
            print("You can now use the Intel Leakage Search in DocuShield.")
        else:
            print("\nFAILED: Could not authorize.")
        
        await client.disconnect()
    except Exception as e:
        print(f"\nERROR: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
