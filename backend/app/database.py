import os

from pymongo import MongoClient
from dotenv import load_dotenv
import certifi


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")

if not MONGODB_URL:
    raise ValueError("MONGODB_URL is not set in .env")


# ============================================================
# MONGODB CLIENT
# ============================================================

client = None
db = None
analysis_collection = None

try:
    if MONGODB_URL:
        client = MongoClient(
            MONGODB_URL,
            tls=True,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000,
            socketTimeoutMS=10000,
            retryWrites=True,
        )
        db = client["truthlens"]
        analysis_collection = db["analysis_history"]
    else:
        print("Warning: MONGODB_URL is not configured in .env")
except Exception as err:
    print(f"MongoDB initialization warning: {err}")
    client = None
    db = None
    analysis_collection = None


# ============================================================
# CONNECTION TEST
# ============================================================

def test_database_connection():
    global client, db, analysis_collection
    if client is None:
        try:
            if MONGODB_URL:
                client = MongoClient(
                    MONGODB_URL,
                    tls=True,
                    tlsCAFile=certifi.where(),
                    serverSelectionTimeoutMS=10000,
                    connectTimeoutMS=10000,
                    socketTimeoutMS=10000,
                    retryWrites=True,
                )
                db = client["truthlens"]
                analysis_collection = db["analysis_history"]
        except Exception:
            return False

    try:
        if client is not None:
            client.admin.command("ping")
            return True
        return False
    except Exception as e:
        print(f"MongoDB connection test error: {e}")
        return False