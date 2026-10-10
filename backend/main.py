import base64
import hashlib
import hmac
import logging
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
import mysql.connector
import uvicorn
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("manzil")

app = FastAPI(title="Manzil API", version="1.0.0")
security = HTTPBearer(auto_error=False)

BACKEND_HOST = os.getenv("BACKEND_HOST", "127.0.0.1")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8001"))
JWT_SECRET = os.getenv("JWT_SECRET", "change-this-development-secret-2026")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60

allowed_origins = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: str
    password: str


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)


class PreferencesRequest(BaseModel):
    purpose: str | None = None
    quiet: bool = False
    wifi: bool = False
    charging: bool = False
    outdoor: bool = False
    pet_friendly: bool = False
    ac: bool = False
    cozy: bool = False
    budget: int | None = Field(default=None, ge=0)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    password_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 600_000)
    return (
        "pbkdf2_sha256$600000$"
        + base64.b64encode(salt).decode()
        + "$"
        + base64.b64encode(password_hash).decode()
    )


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, encoded_salt, encoded_hash = stored_hash.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        actual_hash = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), base64.b64decode(encoded_salt), int(iterations)
        )
        return hmac.compare_digest(actual_hash, base64.b64decode(encoded_hash))
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: int, email: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    return jwt.encode(
        {"sub": str(user_id), "email": email, "exp": expires_at},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def get_db_connection():
    try:
        return mysql.connector.connect(
            host=os.getenv("DB_HOST", "127.0.0.1"),
            port=int(os.getenv("DB_PORT", "3306")),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "manzil"),
        )
    except mysql.connector.Error as error:
        logger.error("Database connection failed: %s", error)
        raise HTTPException(status_code=503, detail="Database is unavailable.") from error


def initialize_tables() -> None:
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS saved_cafes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                cafe_id INT NOT NULL,
                cafe_name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_saved_cafe (user_id, cafe_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS search_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                query_text VARCHAR(500) NOT NULL,
                preferences JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id INT PRIMARY KEY,
                preferences JSON NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        connection.commit()
    finally:
        cursor.close()
        connection.close()


@app.on_event("startup")
def startup() -> None:
    try:
        initialize_tables()
    except HTTPException:
        logger.warning("Database initialization skipped; endpoints will report availability errors.")


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict[str, Any]:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="A bearer token is required.")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"id": int(payload["sub"]), "email": payload["email"]}
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError) as error:
        raise HTTPException(status_code=401, detail="Invalid or expired token.") from error


def optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict[str, Any] | None:
    if credentials is None:
        return None
    return current_user(credentials)


def parse_query(query: str) -> dict[str, Any]:
    normalized = query.lower().replace("–", "-").replace("—", "-")
    preferences: dict[str, Any] = {
        "purpose": None,
        "quiet": bool(re.search(r"\bquiet|peaceful|calm\b", normalized)),
        "wifi": bool(re.search(r"wi[\s-]?fi", normalized)),
        "charging": bool(re.search(r"charg|power outlet|socket", normalized)),
        "outdoor": bool(re.search(r"outdoor|outside|garden|patio", normalized)),
        "pet_friendly": bool(re.search(r"pet[\s-]?friendly|pets|dog friendly", normalized)),
        "ac": bool(re.search(r"\bac\b|air conditioning|air-conditioned", normalized)),
        "cozy": bool(re.search(r"cozy|cosy|warm|comfortable", normalized)),
        "budget": None,
    }
    for purpose, words in {
        "study": r"study|studying|reading|book",
        "work": r"work|working|laptop|productive",
        "date": r"date|romantic|couple",
        "friends": r"friend|friends|meetup|meeting",
    }.items():
        if re.search(words, normalized):
            preferences["purpose"] = purpose
            break
    budget_match = re.search(
        r"(?:under|below|budget(?:\s+of)?|up to|upto)?\s*₹?\s*(\d+)", normalized
    )
    if budget_match:
        preferences["budget"] = int(budget_match.group(1))
    return preferences


def cafe_matches(cafe: dict[str, Any], preferences: dict[str, Any]) -> bool:
    if preferences["purpose"] and cafe.get("purpose") != preferences["purpose"]:
        return False
    for key in ("quiet", "wifi", "charging", "outdoor", "pet_friendly", "ac"):
        if preferences[key] and not cafe.get(key):
            return False
    if preferences["cozy"] and not (
        cafe.get("purpose") == "date" or cafe.get("outdoor") or cafe.get("quiet")
    ):
        return False
    return not (
        preferences["budget"] is not None
        and float(cafe.get("price", 0)) > preferences["budget"]
    )


def rank_cafe(cafe: dict[str, Any], preferences: dict[str, Any]) -> dict[str, Any]:
    weights = {
        "quiet": (20, "quiet"),
        "wifi": (15, "Wi-Fi"),
        "charging": (10, "charging"),
        "outdoor": (10, "outdoor seating"),
        "pet_friendly": (10, "pet friendly"),
        "ac": (5, "AC"),
    }
    score = 0
    possible = 0
    matched: list[str] = []
    if preferences["purpose"]:
        possible += 30
        if cafe.get("purpose") == preferences["purpose"]:
            score += 30
            matched.append(preferences["purpose"])
    for key, (weight, label) in weights.items():
        if preferences[key]:
            possible += weight
            if cafe.get(key):
                score += weight
                matched.append(label)
    if preferences["cozy"]:
        possible += 10
        if cafe.get("purpose") == "date" or cafe.get("outdoor") or cafe.get("quiet"):
            score += 10
            matched.append("cozy atmosphere")
    if preferences["budget"] is not None:
        possible += 20
        if float(cafe.get("price", 0)) <= preferences["budget"]:
            score += 20
            matched.append("within budget")
    result = dict(cafe)
    result["matchScore"] = round(score / possible * 100) if possible else 50
    result["matchedFeatures"] = matched
    result["recommendationReason"] = (
        "Great match"
        + (f" for {preferences['purpose']}" if preferences["purpose"] else "")
        + (f" - {', '.join(matched[:3])}." if matched else ".")
    )
    return result


def fetch_cafes() -> list[dict[str, Any]]:
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM cafes")
        return cursor.fetchall()
    except mysql.connector.Error as error:
        raise HTTPException(status_code=500, detail="Could not load cafés.") from error
    finally:
        cursor.close()
        connection.close()


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Welcome to Manzil API", "status": "running"}


@app.get("/health")
def read_health() -> dict[str, str]:
    return {"status": "healthy"}


@app.get("/db-test")
def db_test() -> dict[str, str]:
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("SELECT DATABASE()")
        return {"status": "connected", "database": cursor.fetchone()[0]}
    finally:
        cursor.close()
        connection.close()


@app.get("/cafes")
def get_cafes(
    purpose: str | None = Query(default=None),
    max_price: int | None = Query(default=None, ge=0),
) -> list[dict[str, Any]]:
    cafes = fetch_cafes()
    if purpose:
        cafes = [cafe for cafe in cafes if cafe.get("purpose") == purpose]
    if max_price is not None:
        cafes = [cafe for cafe in cafes if float(cafe.get("price", 0)) <= max_price]
    return cafes


@app.post("/nlp/parse")
def parse_natural_language(request: SearchRequest) -> dict[str, Any]:
    return {"query": request.query, "preferences": parse_query(request.query)}


@app.post("/search/recommendations")
def recommendations(
    request: SearchRequest,
    user: dict[str, Any] | None = Depends(optional_user),
):
    preferences = parse_query(request.query)
    cafes = [rank_cafe(cafe, preferences) for cafe in fetch_cafes() if cafe_matches(cafe, preferences)]
    cafes.sort(key=lambda cafe: (-cafe["matchScore"], float(cafe.get("price", 0))))
    if user:
        connection = get_db_connection()
        cursor = connection.cursor()
        try:
            import json
            cursor.execute(
                "INSERT INTO search_history (user_id, query_text, preferences) VALUES (%s, %s, %s)",
                (user["id"], request.query, json.dumps(preferences)),
            )
            connection.commit()
        finally:
            cursor.close()
            connection.close()
    return {"query": request.query, "preferences": preferences, "cafes": cafes}


@app.post("/auth/signup")
def signup(request: SignupRequest):
    name, email = request.name.strip(), request.email.strip().lower()
    if not name or not email:
        raise HTTPException(status_code=400, detail="Name and email are required.")
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        cursor.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)",
            (name, email, hash_password(request.password)),
        )
        connection.commit()
        user_id = cursor.lastrowid
        return {
            "message": "Account created successfully.",
            "access_token": create_access_token(user_id, email),
            "token_type": "bearer",
            "user": {"id": user_id, "name": name, "email": email},
        }
    except mysql.connector.Error as error:
        connection.rollback()
        raise HTTPException(status_code=500, detail="Could not create the account.") from error
    finally:
        cursor.close()
        connection.close()


@app.post("/auth/login")
def login(request: LoginRequest):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, name, email, password_hash FROM users WHERE email = %s",
            (request.email.strip().lower(),),
        )
        user = cursor.fetchone()
        if not user or not verify_password(request.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        return {
            "message": "Logged in successfully.",
            "access_token": create_access_token(user["id"], user["email"]),
            "token_type": "bearer",
            "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
        }
    finally:
        cursor.close()
        connection.close()


@app.get("/saved")
def get_saved_cafes(user: dict[str, Any] = Depends(current_user)):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT cafe_id, cafe_name, created_at FROM saved_cafes WHERE user_id = %s ORDER BY created_at DESC",
            (user["id"],),
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        connection.close()


@app.post("/saved/{cafe_id}")
def save_cafe(cafe_id: int, cafe_name: str = Query(..., min_length=1), user: dict[str, Any] = Depends(current_user)):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            "INSERT INTO saved_cafes (user_id, cafe_id, cafe_name) VALUES (%s, %s, %s) "
            "ON DUPLICATE KEY UPDATE cafe_name = VALUES(cafe_name)",
            (user["id"], cafe_id, cafe_name),
        )
        connection.commit()
        return {"saved": True, "cafe_id": cafe_id, "cafe_name": cafe_name}
    finally:
        cursor.close()
        connection.close()


@app.delete("/saved/{cafe_id}")
def unsave_cafe(cafe_id: int, user: dict[str, Any] = Depends(current_user)):
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("DELETE FROM saved_cafes WHERE user_id = %s AND cafe_id = %s", (user["id"], cafe_id))
        connection.commit()
        return {"saved": False, "cafe_id": cafe_id}
    finally:
        cursor.close()
        connection.close()


@app.get("/history")
def get_search_history(
    limit: int = Query(default=20, ge=1, le=100),
    user: dict[str, Any] = Depends(current_user),
):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, query_text, preferences, created_at FROM search_history "
            "WHERE user_id = %s ORDER BY created_at DESC LIMIT %s",
            (user["id"], limit),
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        connection.close()


@app.get("/preferences")
def get_preferences(user: dict[str, Any] = Depends(current_user)):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT preferences, updated_at FROM user_preferences WHERE user_id = %s", (user["id"],))
        return cursor.fetchone() or {"preferences": {}, "updated_at": None}
    finally:
        cursor.close()
        connection.close()


@app.put("/preferences")
def save_preferences(request: PreferencesRequest, user: dict[str, Any] = Depends(current_user)):
    import json
    preferences = request.model_dump(exclude_none=True)
    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            "INSERT INTO user_preferences (user_id, preferences) VALUES (%s, %s) "
            "ON DUPLICATE KEY UPDATE preferences = VALUES(preferences)",
            (user["id"], json.dumps(preferences)),
        )
        connection.commit()
        return {"preferences": preferences}
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    uvicorn.run("main:app", host=BACKEND_HOST, port=BACKEND_PORT, reload=True)
