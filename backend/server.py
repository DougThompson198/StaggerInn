from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
import os
import time
import uuid

import google.auth
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import service_account
import jwt
import requests
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.cors import CORSMiddleware
from typing import Annotated, List, Optional


CABINS = ["Homestead & Bunkie", "PinePoint", "Cedar Grove", "Sugar Shack"]

FIREBASE_CONFIG = {
    "apiKey": os.environ.get(
        "FIREBASE_API_KEY", "AIzaSyB27yvTXac8DUivuj611CD06WIuz8ad9A0"
    ),
    "authDomain": os.environ.get(
        "FIREBASE_AUTH_DOMAIN", "staggerinn-bookings.firebaseapp.com"
    ),
    "projectId": os.environ.get("FIREBASE_PROJECT_ID", "staggerinn-bookings"),
    "storageBucket": os.environ.get(
        "FIREBASE_STORAGE_BUCKET", "staggerinn-bookings.firebasestorage.app"
    ),
    "messagingSenderId": os.environ.get("FIREBASE_MESSAGING_SENDER_ID", "279775182024"),
    "appId": os.environ.get(
        "FIREBASE_APP_ID", "1:279775182024:web:a94312dba7ac6856b8f9fd"
    ),
    "measurementId": os.environ.get("FIREBASE_MEASUREMENT_ID", "G-ZPRXQ0GHD1"),
}

FIRESTORE_BASE_URL = (
    "https://firestore.googleapis.com/v1/projects/"
    f"{FIREBASE_CONFIG['projectId']}/databases/(default)/documents"
)
FIRESTORE_SCOPE = ["https://www.googleapis.com/auth/datastore"]
FIREBASE_CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/"
    "securetoken@system.gserviceaccount.com"
)
GOOGLE_CREDENTIALS = None
FIREBASE_CERTS = {}
FIREBASE_CERTS_EXPIRES_AT = 0


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Cottage Cabin Tracker", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")


class VerifyResponse(BaseModel):
    ok: bool
    email: Optional[str] = None


class CabinsResponse(BaseModel):
    cabins: List[str]


class BookingBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    guest_name: str = Field(..., min_length=1, max_length=120)
    cabin: str
    check_in: str
    check_out: str
    notes: Optional[str] = ""


class BookingCreate(BookingBase):
    pass


class BookingUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    guest_name: Optional[str] = Field(None, min_length=1, max_length=120)
    cabin: Optional[str] = None
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    notes: Optional[str] = None


class Booking(BookingBase):
    id: str
    created_at: str
    updated_at: str


def firestore_url(path: str = "", user_token: Optional[str] = None) -> str:
    url = f"{FIRESTORE_BASE_URL}/{path.lstrip('/')}" if path else FIRESTORE_BASE_URL
    if GOOGLE_CREDENTIALS or user_token:
        return url
    separator = "&" if "?" in url else "?"
    return f"{url}{separator}key={FIREBASE_CONFIG['apiKey']}"


def load_google_credentials():
    service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    if service_account_json:
        info = json.loads(service_account_json)
        return service_account.Credentials.from_service_account_info(
            info, scopes=FIRESTORE_SCOPE
        )
    try:
        credentials, _ = google.auth.default(scopes=FIRESTORE_SCOPE)
        return credentials
    except Exception:
        return None


def firebase_headers(user_token: Optional[str] = None):
    if not GOOGLE_CREDENTIALS:
        if user_token:
            return {"Authorization": f"Bearer {user_token}"}
        return {}
    if not GOOGLE_CREDENTIALS.valid:
        GOOGLE_CREDENTIALS.refresh(GoogleAuthRequest())
    return {"Authorization": f"Bearer {GOOGLE_CREDENTIALS.token}"}


def firestore_request(method: str, path: str, user_token: Optional[str] = None, **kwargs):
    headers = kwargs.pop("headers", {})
    headers.update(firebase_headers(user_token))
    try:
        response = requests.request(
            method, firestore_url(path, user_token), headers=headers, timeout=15, **kwargs
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="Firebase is unreachable") from exc

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="Booking not found")
    if response.status_code >= 400:
        detail = response.text
        try:
            detail = response.json().get("error", {}).get("message", detail)
        except ValueError:
            pass
        raise HTTPException(status_code=502, detail=f"Firebase error: {detail}")
    return response.json() if response.content else {}


def field_value(value):
    return {"stringValue": "" if value is None else str(value)}


def booking_to_firestore(booking: Booking):
    return {
        "fields": {
            "id": field_value(booking.id),
            "guest_name": field_value(booking.guest_name),
            "cabin": field_value(booking.cabin),
            "check_in": field_value(booking.check_in),
            "check_out": field_value(booking.check_out),
            "notes": field_value(booking.notes or ""),
            "created_at": field_value(booking.created_at),
            "updated_at": field_value(booking.updated_at),
        }
    }


def firestore_field_to_python(field):
    for key in ("stringValue", "integerValue", "doubleValue", "booleanValue"):
        if key in field:
            return field[key]
    return ""


def booking_from_firestore(document) -> Booking:
    fields = document.get("fields", {})
    data = {key: firestore_field_to_python(value) for key, value in fields.items()}
    if not data.get("id"):
        data["id"] = document.get("name", "").rsplit("/", 1)[-1]
    data.setdefault("notes", "")
    data.setdefault("created_at", datetime.now(timezone.utc).isoformat())
    data.setdefault("updated_at", data["created_at"])
    return Booking(**data)


def parse_iso_date(value: str, label: str):
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"{label} must be YYYY-MM-DD") from exc


def validate_booking_data(data):
    data["guest_name"] = data["guest_name"].strip()
    if data["cabin"] not in CABINS:
        raise HTTPException(status_code=400, detail="Unknown cabin")

    check_in = parse_iso_date(data["check_in"], "check_in")
    check_out = parse_iso_date(data["check_out"], "check_out")
    if check_out <= check_in:
        raise HTTPException(status_code=400, detail="check_out must be after check_in")
    return data


def firebase_certs():
    global FIREBASE_CERTS, FIREBASE_CERTS_EXPIRES_AT
    if FIREBASE_CERTS and time.time() < FIREBASE_CERTS_EXPIRES_AT:
        return FIREBASE_CERTS

    response = requests.get(FIREBASE_CERTS_URL, timeout=15)
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Could not load Firebase certs")

    max_age = 3600
    cache_control = response.headers.get("cache-control", "")
    for part in cache_control.split(","):
        part = part.strip()
        if part.startswith("max-age="):
            try:
                max_age = int(part.split("=", 1)[1])
            except ValueError:
                pass
    FIREBASE_CERTS = response.json()
    FIREBASE_CERTS_EXPIRES_AT = time.time() + max_age
    return FIREBASE_CERTS


def verify_firebase_token(token: str):
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid Firebase token") from exc

    cert = firebase_certs().get(header.get("kid"))
    if not cert:
        FIREBASE_CERTS.clear()
        cert = firebase_certs().get(header.get("kid"))
    if not cert:
        raise HTTPException(status_code=401, detail="Unknown Firebase token signer")

    project_id = FIREBASE_CONFIG["projectId"]
    try:
        claims = jwt.decode(
            token,
            cert,
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"https://securetoken.google.com/{project_id}",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired Firebase token") from exc

    if not claims.get("email"):
        raise HTTPException(status_code=401, detail="Firebase token has no email")
    return claims


def require_auth(authorization: Annotated[Optional[str], Header()] = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    claims = verify_firebase_token(token)
    return {"token": token, "claims": claims}


def list_all_bookings(user_token: str) -> List[Booking]:
    data = firestore_request("GET", "bookings", user_token=user_token)
    documents = data.get("documents", [])
    bookings = [booking_from_firestore(document) for document in documents]
    return sorted(bookings, key=lambda item: (item.check_in, item.cabin, item.guest_name))


def get_booking(booking_id: str, user_token: str) -> Booking:
    data = firestore_request("GET", f"bookings/{booking_id}", user_token=user_token)
    return booking_from_firestore(data)


def save_booking(booking: Booking, user_token: str) -> Booking:
    firestore_request(
        "PATCH",
        f"bookings/{booking.id}",
        user_token=user_token,
        json=booking_to_firestore(booking),
    )
    return booking


@api_router.post("/auth/verify", response_model=VerifyResponse)
async def verify_auth(auth=Depends(require_auth)):
    return VerifyResponse(ok=True, email=auth["claims"].get("email"))


@api_router.get("/cabins", response_model=CabinsResponse)
async def get_cabins():
    return CabinsResponse(cabins=CABINS)


@api_router.get("/bookings", response_model=List[Booking])
async def list_bookings(auth=Depends(require_auth)):
    return list_all_bookings(auth["token"])


@api_router.post("/bookings", response_model=Booking)
async def create_booking(payload: BookingCreate, auth=Depends(require_auth)):
    now = datetime.now(timezone.utc).isoformat()
    data = validate_booking_data(payload.model_dump())
    booking = Booking(id=str(uuid.uuid4()), created_at=now, updated_at=now, **data)
    return save_booking(booking, auth["token"])


@api_router.put("/bookings/{booking_id}", response_model=Booking)
async def update_booking(
    booking_id: str, payload: BookingUpdate, auth=Depends(require_auth)
):
    existing = get_booking(booking_id, auth["token"])
    merged = existing.model_dump()
    merged.update({k: v for k, v in payload.model_dump().items() if v is not None})
    merged["updated_at"] = datetime.now(timezone.utc).isoformat()
    validated = validate_booking_data(merged)
    booking = Booking(**validated)
    return save_booking(booking, auth["token"])


@api_router.delete("/bookings/{booking_id}", response_model=VerifyResponse)
async def delete_booking(booking_id: str, auth=Depends(require_auth)):
    get_booking(booking_id, auth["token"])
    firestore_request("DELETE", f"bookings/{booking_id}", user_token=auth["token"])
    return VerifyResponse(ok=True)


app.include_router(api_router)
GOOGLE_CREDENTIALS = load_google_credentials()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
