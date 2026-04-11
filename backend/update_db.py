from sqlalchemy import text
from app.db.database import engine

def update_db():
    queries = [
        "ALTER TABLE analysis_results ADD COLUMN malware_score FLOAT;",
        "ALTER TABLE analysis_results ADD COLUMN malware_details JSON;"
    ]
    with engine.connect() as conn:
        for query in queries:
            try:
                print(f"Executing: {query}")
                conn.execute(text(query))
                conn.commit()
                print("Success")
            except Exception as e:
                print(f"Error: {e}")

if __name__ == "__main__":
    update_db()
