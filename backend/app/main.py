import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings, TIMEZONE_BR
from app.database import engine, Base, SessionLocal
from app.models import *  # noqa: F401,F403
from app.models.user import User, UserRole
from app.models.printer import PrinterCollectionSchedule
from app.utils.security import hash_password
from app.api import auth, users, devices, agent, locations, remote, dashboard, audit, printers
from app.api.printers import collect_all_printers
from app.websocket.routes import router as ws_router

logger = logging.getLogger("SixID")


def _seed_admin():
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.username == "admin").first():
            admin = User(
                username="admin",
                email="admin@sysid9.local",
                password_hash=hash_password("admin123"),
                full_name="Administrator",
                role=UserRole.ADMIN,
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()


def _check_printer_schedule():
    db = SessionLocal()
    try:
        sched = db.query(PrinterCollectionSchedule).first()
        if not sched or not sched.enabled:
            return
        now = datetime.now(TIMEZONE_BR)
        last_run = sched.last_run
        if last_run and last_run.tzinfo is None:
            last_run = last_run.replace(tzinfo=TIMEZONE_BR)
        due = last_run is None or (now - last_run) >= timedelta(minutes=sched.interval_minutes)
        if not due:
            return
        result = collect_all_printers(db)
        sched.last_run = now
        db.commit()
        logger.info(f"Coleta SNMP automatica: {result['collected']} impressora(s) coletada(s)")
    except Exception as e:
        logger.error(f"Erro na coleta SNMP automatica: {e}")
    finally:
        db.close()


scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _seed_admin()
    scheduler.add_job(_check_printer_schedule, "interval", minutes=1, id="printer_schedule_check")
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    redirect_slashes=False,
    description="Sistema de Gestão de Ativos e Inventário de TI",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(devices.router)
app.include_router(agent.router)
app.include_router(locations.router)
app.include_router(remote.router)
app.include_router(dashboard.router)
app.include_router(audit.router)
app.include_router(printers.router)
app.include_router(ws_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": settings.APP_VERSION}
