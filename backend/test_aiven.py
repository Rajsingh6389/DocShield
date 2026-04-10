import pymysql
import ssl
import time
import os
from dotenv import load_dotenv

# Load .env from backend directory
load_dotenv()

def test_aiven_connection():
    host = os.getenv("DATABASE_HOST", "mysql-3ae41242-rajsingh912547-2e38.a.aivencloud.com")
    port = int(os.getenv("DATABASE_PORT", 10392))
    user = os.getenv("DATABASE_USER", "avnadmin")
    password = os.getenv("DATABASE_PASSWORD") # Get from .env
    db = os.getenv("DATABASE_NAME", "defaultdb")

    print(f"Testing connectivity to {host}:{port}...")
    
    # Try without SSL first to check for TCP timeout
    try:
        start = time.time()
        print("Attempting connection without SSL (to check raw TCP reachable)...")
        conn = pymysql.connect(
            host=host,
            user=user,
            password=password,
            db=db,
            port=port,
            connect_timeout=5
        )
        print(f"Connected in {time.time() - start:.2f}s!")
        conn.close()
    except Exception as e:
        print(f"Failed without SSL: {e}")

    # Try with SSL (common Aiven requirement)
    try:
        start = time.time()
        print("Attempting connection with SSL enabled...")
        conn = pymysql.connect(
            host=host,
            user=user,
            password=password,
            db=db,
            port=port,
            connect_timeout=5,
            ssl={'ssl': True} # Simple SSL enable
        )
        print(f"Connected with SSL in {time.time() - start:.2f}s!")
        conn.close()
    except Exception as e:
        print(f"Failed with SSL: {e}")

if __name__ == "__main__":
    test_aiven_connection()
