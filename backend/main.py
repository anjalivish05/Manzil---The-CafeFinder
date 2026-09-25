from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Manzil API")
BACKEND_HOST = "127.0.0.1"
BACKEND_PORT = 8001

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT")),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )
# Local development origins for the existing frontend and common dev servers.
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


@app.get("/")
def read_root() -> dict[str, str]:
    return {
        "message": "Welcome to Manzil API",
        "status": "running",
    }


@app.get("/health")
def read_health():
    return {"status": "healthy"}

@app.get("/db-test")
def db_test():
    try:
        connection = get_db_connection()

        cursor = connection.cursor()
        cursor.execute("SELECT DATABASE();")

        result = cursor.fetchone()

        cursor.close()
        connection.close()

        return {
            "status": "connected",
            "database": result[0]
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
def read_health() -> dict[str, str]:
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=BACKEND_HOST,
        port=BACKEND_PORT,
        reload=True,
    )
@app.get("/cafes")
def get_cafes():
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT * FROM cafes")

        cafes = cursor.fetchall()

        cursor.close()
        connection.close()

        return cafes

    except Exception as e:
        return {"error": str(e)}