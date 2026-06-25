"""Backend API tests for Cottage Cabin Tracker."""
import os
from datetime import date, timedelta

import pytest
import requests


BASE_URL = (
    os.environ.get("REACT_APP_API_URL")
    or os.environ.get("REACT_APP_BACKEND_URL")
    or "http://localhost:8000"
).rstrip("/")
API = f"{BASE_URL}/api"
FIREBASE_TEST_ID_TOKEN = os.environ.get("FIREBASE_TEST_ID_TOKEN")


@pytest.fixture(scope="module")
def auth_headers():
    if not FIREBASE_TEST_ID_TOKEN:
        pytest.skip("Set FIREBASE_TEST_ID_TOKEN to run authenticated backend tests")
    return {"Authorization": f"Bearer {FIREBASE_TEST_ID_TOKEN}"}


def test_verify_requires_auth():
    r = requests.post(f"{API}/auth/verify", timeout=15)
    assert r.status_code == 401


def test_verify_ok(auth_headers):
    r = requests.post(f"{API}/auth/verify", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    assert r.json().get("ok") is True


def test_get_cabins():
    r = requests.get(f"{API}/cabins", timeout=15)
    assert r.status_code == 200
    assert r.json()["cabins"] == [
        "Homestead & Bunkie",
        "PinePoint",
        "Cedar Grove",
        "Sugar Shack",
    ]


def test_list_bookings_no_auth():
    r = requests.get(f"{API}/bookings", timeout=15)
    assert r.status_code == 401


def test_create_booking_no_auth():
    r = requests.post(
        f"{API}/bookings",
        json={
            "guest_name": "TEST_NoAuth",
            "cabin": "PinePoint",
            "check_in": "2026-01-01",
            "check_out": "2026-01-05",
        },
        timeout=15,
    )
    assert r.status_code == 401


def test_booking_crud_flow(auth_headers):
    today = date.today()
    payload = {
        "guest_name": "TEST_Murphys",
        "cabin": "Homestead & Bunkie",
        "check_in": today.isoformat(),
        "check_out": (today + timedelta(days=4)).isoformat(),
    }

    r = requests.post(f"{API}/bookings", json=payload, headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
    booking = r.json()
    assert booking["guest_name"] == "TEST_Murphys"
    assert booking["cabin"] == "Homestead & Bunkie"
    assert "id" in booking
    booking_id = booking["id"]

    r = requests.get(f"{API}/bookings", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    assert booking_id in [item["id"] for item in r.json()]

    r = requests.put(
        f"{API}/bookings/{booking_id}",
        json={"guest_name": "TEST_MurphysUpdated"},
        headers=auth_headers,
        timeout=15,
    )
    assert r.status_code == 200, r.text
    assert r.json()["guest_name"] == "TEST_MurphysUpdated"

    r = requests.delete(f"{API}/bookings/{booking_id}", headers=auth_headers, timeout=15)
    assert r.status_code == 200

    r = requests.get(f"{API}/bookings", headers=auth_headers, timeout=15)
    assert booking_id not in [item["id"] for item in r.json()]


def test_create_invalid_cabin(auth_headers):
    r = requests.post(
        f"{API}/bookings",
        json={
            "guest_name": "TEST_BadCabin",
            "cabin": "Lakeview",
            "check_in": "2026-02-01",
            "check_out": "2026-02-03",
        },
        headers=auth_headers,
        timeout=15,
    )
    assert r.status_code == 400


def test_create_invalid_dates(auth_headers):
    r = requests.post(
        f"{API}/bookings",
        json={
            "guest_name": "TEST_BadDate",
            "cabin": "PinePoint",
            "check_in": "2026-02-05",
            "check_out": "2026-02-05",
        },
        headers=auth_headers,
        timeout=15,
    )
    assert r.status_code == 400

    r = requests.post(
        f"{API}/bookings",
        json={
            "guest_name": "TEST_BadDate",
            "cabin": "PinePoint",
            "check_in": "2026-02-10",
            "check_out": "2026-02-05",
        },
        headers=auth_headers,
        timeout=15,
    )
    assert r.status_code == 400


def test_update_not_found(auth_headers):
    r = requests.put(
        f"{API}/bookings/does-not-exist",
        json={"guest_name": "x"},
        headers=auth_headers,
        timeout=15,
    )
    assert r.status_code == 404


def test_delete_not_found(auth_headers):
    r = requests.delete(
        f"{API}/bookings/does-not-exist", headers=auth_headers, timeout=15
    )
    assert r.status_code == 404
