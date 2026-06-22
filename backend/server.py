from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import secrets
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Annotated
from datetime import datetime, timezone, date
import uuid


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')


SHARED_PASSWORD = os.environ.get('CABIN_SHARED_PASSWORD', 'cottage2026')

# In-memory token store (process-local). Acceptable for a small family tool.
ACTIVE_TOKENS = set()

CABINS = ["Homestead & Bunkie", "PinePoint", "Cedar Grove", "Sugar Shack"]

app = FastAPI(title="Cottage Cabin Tracker")
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    token: str


class BookingBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    guest_name: str = Field(..., min_length=1, max_length=120)
    cabin: str
    check_in: str   # ISO date YYYY-MM-DD
    check_out: str  # ISO date YYYY-MM-DD
    notes: Optional[str] = ""


class BookingCreate(BookingBase):
    pass


class BookingUpdate(BaseModel):
    guest_name: Optional[str] = None
    cabin: Optional[str] = None
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    notes: Optional[str] = None


class Booking(BookingBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ---------- Auth dependency ----------
def require_auth(authorization: Annotated[Optional[str], Header()] = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    if token not in ACTIVE_TOKENS:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return token


def validate_booking_payload(guest_name: str, cabin: str, check_in: str, check_out: str):
    if cabin not in CABINS:
        raise HTTPException(status_code=400, detail=f"Cabin must be one of {CABINS}")
    try:
        ci = date.fromisoformat(check_in)
        co = date.fromisoformat(check_out)
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be ISO format YYYY-MM-DD")
    if co <= ci:
        raise HTTPException(status_code=400, detail="Check-out must be after check-in")
    if not guest_name.strip():
        raise HTTPException(status_code=400, detail="Guest name required")


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Cottage Cabin Tracker API"}


@api_router.get("/cabins")
async def get_cabins():
    return {"cabins": CABINS}


@api_router.post("/auth/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    if payload.password != SHARED_PASSWORD:
        raise HTTPException(status_code=401, detail="Incorrect password")
    token = secrets.token_urlsafe(32)
    ACTIVE_TOKENS.add(token)
    return LoginResponse(token=token)


@api_router.post("/auth/verify")
async def verify(_: str = Depends(require_auth)):
    return {"ok": True}


@api_router.get("/bookings", response_model=List[Booking])
async def list_bookings(_: str = Depends(require_auth)):
    docs = await db.bookings.find({}, {"_id": 0}).to_list(2000)
    return docs


@api_router.post("/bookings", response_model=Booking)
async def create_booking(payload: BookingCreate, _: str = Depends(require_auth)):
    validate_booking_payload(payload.guest_name, payload.cabin, payload.check_in, payload.check_out)
    booking = Booking(**payload.model_dump())
    await db.bookings.insert_one(booking.model_dump())
    return booking


@api_router.put("/bookings/{booking_id}", response_model=Booking)
async def update_booking(booking_id: str, payload: BookingUpdate, _: str = Depends(require_auth)):
    existing = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Booking not found")
    updated = {**existing, **{k: v for k, v in payload.model_dump().items() if v is not None}}
    validate_booking_payload(updated["guest_name"], updated["cabin"], updated["check_in"], updated["check_out"])
    await db.bookings.update_one({"id": booking_id}, {"$set": updated})
    return updated


@api_router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, _: str = Depends(require_auth)):
    result = await db.bookings.delete_one({"id": booking_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
