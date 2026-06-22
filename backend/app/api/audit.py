from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.tracking import AuditLog
from app.models.user import User, UserRole
from app.schemas.audit import AuditLogResponse
from app.utils.security import require_role

router = APIRouter(prefix="/api/audit", tags=["Audit"])


@router.get("/logs", response_model=list[AuditLogResponse])
def list_audit_logs(
    action: str | None = None,
    target_type: str | None = None,
    user_id: int | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _=Depends(require_role(UserRole.ADMIN)),
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if target_type:
        query = query.filter(AuditLog.target_type == target_type)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    logs = (query.order_by(AuditLog.created_at.desc())
            .offset((page - 1) * page_size).limit(page_size).all())

    result = []
    for log in logs:
        resp = AuditLogResponse.model_validate(log)
        if log.user:
            resp.username = log.user.username
        result.append(resp)
    return result
