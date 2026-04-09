import pymysql
import os
from dotenv import load_dotenv

load_dotenv(".env")
DB_HOST = os.getenv("MYSQL_HOST")
DB_USER = os.getenv("MYSQL_USER")
DB_PASS = os.getenv("MYSQL_PASSWORD")
DB_NAME = os.getenv("MYSQL_DB")
DB_PORT = int(os.getenv("MYSQL_PORT", 3306))

def fix_verdicts():
    conn = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        port=DB_PORT,
    )
    try:
        with conn.cursor() as cur:
            cur.execute("ALTER TABLE analysis_results MODIFY verdict ENUM('authentic', 'suspicious', 'forged', 'pending') DEFAULT 'pending';")
            cur.execute("ALTER TABLE cases MODIFY reviewer_verdict ENUM('authentic', 'suspicious', 'forged', 'pending') DEFAULT NULL;")
            conn.commit()
            print("Successfully altered ENUM on both tables.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_verdicts()
