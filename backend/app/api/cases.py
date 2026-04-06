from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_reviewer
from app.db.database import get_db
from app.db.models import Case, Document, User, Verdict
from app.schemas.schemas import CaseOut, CaseUpdate

router = APIRouter(prefix="/cases", tags=["Cases"])


@router.get("/", response_model=List[CaseOut])
def list_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_closed: Optional[bool] = None,
    verdict: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Case)
    if is_closed is not None:
        q = q.filter(Case.is_closed == is_closed)
    if verdict:
        q = q.filter(Case.reviewer_verdict == verdict)
    cases = q.order_by(Case.priority.desc(), Case.created_at.desc()) \
              .offset((page - 1) * page_size).limit(page_size).all()
    return cases


@router.get("/{case_id}", response_model=CaseOut)
def get_case(case_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(404, "Case not found")
    return case


@router.patch("/{case_id}", response_model=CaseOut)
def update_case(
    case_id: str,
    payload: CaseUpdate,
    current_user: User = Depends(require_reviewer),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(404, "Case not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(case, field, value)
    db.commit()
    db.refresh(case)
    return case
