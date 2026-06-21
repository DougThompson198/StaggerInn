"""Backend API tests for Cottage Cabin Tracker."""
import os
from datetime import date, timedelta
import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else None
if not BASE_URL:
    # Read from frontend .env
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip()
                break

API = f"{BASE_URL}/api"
PASSWORD = "cottage2026"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"password": PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# --- auth ---
def test_login_success():
    r = requests.post(f"{API}/auth/login", json={"password": PASSWORD}, timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json().get("token"), str)


def test_login_wrong_password():
    r = requests.post(f"{API}/auth/login", json={"password": "wrong"}, timeout=15)
    assert r.status_code == 401


def test_verify_requires_auth():
    r = requests.post(f"{API}/auth/verify", timeout=15)
    assert r.status_code == 401


def test_verify_ok(auth_headers):
    r = requests.post(f"{API}/auth/verify", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    assert r.json().get("ok") is True


# --- cabins ---
def test_get_cabins():
    r = requests.get(f"{API}/cabins", timeout=15)
    assert r.status_code == 200
    assert r.json()["cabins"] == ["Homestead & Bunkie", "PinePoint"]


# --- bookings ---
def test_list_bookings_no_auth():
    r = requests.get(f"{API}/bookings", timeout=15)
    assert r.status_code == 401


def test_create_booking_no_auth():
    r = requests.post(f"{API}/bookings", json={
        "guest_name": "TEST_NoAuth", "cabin": "PinePoint",
        "check_in": "2026-01-01", "check_out": "2026-01-05"
    }, timeout=15)
    assert r.status_code == 401


def test_booking_crud_flow(auth_headers):
    today = date.today()
    payload = {
        "guest_name": "TEST_Murphys",
        "cabin": "Homestead & Bunkie",
        "check_in": today.isoformat(),
        "check_out": (today + timedelta(days=4)).isoformat(),
    }
    # create
    r = requests.post(f"{API}/bookings", json=payload, headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["guest_name"] == "TEST_Murphys"
    assert b["cabin"] == "Homestead & Bunkie"
    assert "id" in b
    bid = b["id"]

    # list contains it
    r = requests.get(f"{API}/bookings", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    ids = [x["id"] for x in r.json()]
    assert bid in ids

    # update
    r = requests.put(f"{API}/bookings/{bid}",
                     json={"guest_name": "TEST_MurphysUpdated"},
                     headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["guest_name"] == "TEST_MurphysUpdated"

    # get-after-update via list
    r = requests.get(f"{API}/bookings", headers=auth_headers, timeout=15)
    match = [x for x in r.json() if x["id"] == bid][0]
    assert match["guest_name"] == "TEST_MurphysUpdated"

    # delete
    r = requests.delete(f"{API}/bookings/{bid}", headers=auth_headers, timeout=15)
    assert r.status_code == 200

    # gone
    r = requests.get(f"{API}/bookings", headers=auth_headers, timeout=15)
    ids = [x["id"] for x in r.json()]
    assert bid not in ids


def test_create_invalid_cabin(auth_headers):
    r = requests.post(f"{API}/bookings", json={
        "guest_name": "TEST_BadCabin", "cabin": "Lakeview",
        "check_in": "2026-02-01", "check_out": "2026-02-03"
    }, headers=auth_headers, timeout=15)
    assert r.status_code == 400


def test_create_invalid_dates(auth_headers):
    r = requests.post(f"{API}/bookings", json={
        "guest_name": "TEST_BadDate", "cabin": "PinePoint",
        "check_in": "2026-02-05", "check_out": "2026-02-05"
    }, headers=auth_headers, timeout=15)
    assert r.status_code == 400

    r = requests.post(f"{API}/bookings", json={
        "guest_name": "TEST_BadDate", "cabin": "PinePoint",
        "check_in": "2026-02-10", "check_out": "2026-02-05"
    }, headers=auth_headers, timeout=15)
    assert r.status_code == 400


def test_update_not_found(auth_headers):
    r = requests.put(f"{API}/bookings/does-not-exist",
                     json={"guest_name": "x"}, headers=auth_headers, timeout=15)
    assert r.status_code == 404


def test_delete_not_found(auth_headers):
    r = requests.delete(f"{API}/bookings/does-not-exist", headers=auth_headers, timeout=15)
    assert r.status_code == 404
