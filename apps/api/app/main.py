from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.db import SessionLocal, init_db
from app.routers import auth, certificates, leaderboard, scenarios, sessions, users
from app.seeds.scenarios import seed_database
from app.ws import session_ws

init_db()
with SessionLocal() as db:
    seed_database(db)


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="API образовательного симулятора защиты личных данных.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(scenarios.router)
app.include_router(sessions.router)
app.include_router(leaderboard.router)
app.include_router(certificates.router)
app.include_router(session_ws.router)


@app.get("/api/health", tags=["system"])
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
