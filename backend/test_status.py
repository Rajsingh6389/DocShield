from app.db.database import SessionLocal
from app.db.models import Document, AnalysisResult
from app.api.analysis import get_analysis_status
from uuid import UUID

db = SessionLocal()
doc_id = '0ad4b04b-2f57-42ae-91be-c05084a3e274'

try:
    # Simulating the FastAPI call
    res = get_analysis_status(doc_id=doc_id, db=db, current_user=None)
    print(f"SUCCESS: {res}")
except Exception as e:
    import traceback
    print(f"FAILED: {e}")
    traceback.print_exc()
finally:
    db.close()
