from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from contextlib import asynccontextmanager
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Annotated
from datetime import datetime, timezone, date
import os
import secrets
import uuid

# --- In-memory storage ---
ACTIVE_TOKENS = set()
IN_MEMORY_BOOKINGS = [] 
CABINS = ["Homestead & Bunkie", "PinePoint", "Cedar Grove", "Sugar Shack"]
SHARED_PASSWORD = os.environ.get('CABIN_SHARED_PASSWORD', 'Temagami198')

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    ACTIVE_TOKENS.clear()

app = FastAPI(title="Cottage Cabin Tracker", lifespan=lifespan)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    check_in: str
    check_out: str
    notes: Optional[str] = ""

class BookingCreate(BookingBase):
    pass

class Booking(BookingBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ---------- Helpers ----------
def require_auth(authorization: Annotated[Optional[str], Header()] = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    if token not in ACTIVE_TOKENS:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return token

# ---------- Routes ----------
@api_router.get("/bookings", response_model=List[Booking])
async def list_bookings(_: str = Depends(require_auth)):
    return IN_MEMORY_BOOKINGS

@api_router.post("/bookings", response_model=Booking)
async def create_booking(payload: BookingCreate, _: str = Depends(require_auth)):
    booking = Booking(**payload.model_dump())
    IN_MEMORY_BOOKINGS.append(booking)
    return booking

# Added explicit /auth/login to match the path your frontend is calling
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    if payload.password != SHARED_PASSWORD:
        raise HTTPException(status_code=401, detail="Incorrect password")
    token = secrets.token_urlsafe(32)
    ACTIVE_TOKENS.add(token)
    return LoginResponse(token=token)

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
