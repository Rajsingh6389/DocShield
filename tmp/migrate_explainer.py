import pymysql
import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv("backend/.env")

MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
MYSQL_DB = os.getenv("MYSQL_DB", "DocuShield")

def migrate():
    connection = None
    try:
        connection = pymysql.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DB,
            port=MYSQL_PORT
        )
        with connection.cursor() as cursor:
            print(f"Connected to database: {MYSQL_DB}")
            
            # Check if columns exist
            cursor.execute("SHOW COLUMNS FROM analysis_results LIKE 'ai_explainer'")
            if not cursor.fetchone():
                print("Adding column: ai_explainer")
                cursor.execute("ALTER TABLE analysis_results ADD COLUMN ai_explainer TEXT NULL AFTER qr_details")
            else:
                print("Column ai_explainer already exists")
            
            connection.commit()
            print("Migration successful")
            
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        if connection:
            connection.close()

if __name__ == "__main__":
    migrate()
