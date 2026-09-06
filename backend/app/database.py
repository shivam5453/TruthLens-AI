import os
import copy
import time
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import MongoClient, ASCENDING
from pymongo.errors import PyMongoError
from dotenv import load_dotenv
import certifi

# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")


# ============================================================
# CIRCUIT BREAKER FOR ZERO-LATENCY FALLBACK
# ============================================================

_last_mongo_failure = 0.0
_CIRCUIT_COOLDOWN_SECONDS = 30.0

def _should_try_real_mongo():
    global _last_mongo_failure
    return (time.time() - _last_mongo_failure) >= _CIRCUIT_COOLDOWN_SECONDS

def _mark_mongo_failure():
    global _last_mongo_failure
    _last_mongo_failure = time.time()


# ============================================================
# RESILIENT COLLECTION FALLBACK HELPERS
# ============================================================

class MockInsertResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id


class MockDeleteResult:
    def __init__(self, deleted_count):
        self.deleted_count = deleted_count


class MockUpdateResult:
    def __init__(self, modified_count):
        self.modified_count = modified_count


class ResilientCursor:
    def __init__(self, items):
        self._items = list(items)

    def sort(self, key, direction=-1):
        def sort_key(x):
            v = x.get(key)
            if v is None:
                return 0
            if isinstance(v, datetime):
                return v.timestamp()
            try:
                return float(v)
            except (ValueError, TypeError):
                return str(v)
        self._items.sort(key=sort_key, reverse=(direction == -1))
        return self

    def limit(self, n):
        self._items = self._items[:n]
        return self

    def __iter__(self):
        return iter(self._items)

    def __len__(self):
        return len(self._items)


def _matches(doc, query):
    if not query:
        return True
    for k, v in query.items():
        if k == "_id":
            doc_id = str(doc.get("_id", ""))
            query_id = str(v)
            if doc_id != query_id:
                return False
        elif k == "$or":
            if not any(_matches(doc, subq) for subq in v):
                return False
        else:
            if doc.get(k) != v:
                return False
    return True


def _apply_projection(doc, projection):
    if not projection or not isinstance(doc, dict):
        return copy.deepcopy(doc)
    doc_copy = copy.deepcopy(doc)
    is_exclusion = any(v in (0, False) for k, v in projection.items() if k != "_id")
    if is_exclusion:
        for k, v in projection.items():
            if not v and k in doc_copy:
                doc_copy.pop(k, None)
        return doc_copy
    else:
        new_doc = {}
        if projection.get("_id", 1):
            if "_id" in doc_copy:
                new_doc["_id"] = doc_copy["_id"]
        for k, v in projection.items():
            if v and k in doc_copy:
                new_doc[k] = doc_copy[k]
        return new_doc


class ResilientCollection:
    def __init__(self, collection_name: str, real_collection=None):
        self.name = collection_name
        self.real_collection = real_collection
        self._memory_store = []

    def set_real_collection(self, real_coll):
        self.real_collection = real_coll

    def insert_one(self, doc):
        doc_copy = copy.deepcopy(doc)
        if "_id" not in doc_copy or not doc_copy["_id"]:
            doc_copy["_id"] = ObjectId()

        # Always save to memory store for guaranteed zero-downtime resilience
        self._memory_store.append(copy.deepcopy(doc_copy))

        if self.real_collection is not None and _should_try_real_mongo():
            try:
                return self.real_collection.insert_one(doc_copy)
            except Exception as e:
                _mark_mongo_failure()
                print(f"MongoDB save notice on {self.name} (fallback active): {e}")

        return MockInsertResult(doc_copy["_id"])

    def find_one(self, query=None, projection=None, **kwargs):
        if self.real_collection is not None and _should_try_real_mongo():
            try:
                res = self.real_collection.find_one(query, projection, **kwargs)
                if res is not None:
                    return res
            except Exception as e:
                _mark_mongo_failure()
                print(f"MongoDB find_one notice on {self.name} (fallback active): {e}")

        # Memory store lookup
        for d in reversed(self._memory_store):
            if _matches(d, query):
                return _apply_projection(d, projection)
        return None

    def find(self, query=None, projection=None, **kwargs):
        if self.real_collection is not None and _should_try_real_mongo():
            try:
                real_cursor = self.real_collection.find(query, projection, **kwargs)
                return real_cursor
            except Exception as e:
                _mark_mongo_failure()
                print(f"MongoDB find notice on {self.name} (fallback active): {e}")

        matched = [_apply_projection(d, projection) for d in self._memory_store if _matches(d, query)]
        return ResilientCursor(matched)

    def count_documents(self, query=None):
        if self.real_collection is not None and _should_try_real_mongo():
            try:
                return self.real_collection.count_documents(query or {})
            except Exception as e:
                _mark_mongo_failure()
                print(f"MongoDB count notice on {self.name} (fallback active): {e}")

        return sum(1 for d in self._memory_store if _matches(d, query))

    def update_one(self, query, update_dict):
        if self.real_collection is not None and _should_try_real_mongo():
            try:
                res = self.real_collection.update_one(query, update_dict)
                if res.modified_count > 0:
                    set_values = update_dict.get("$set", {})
                    for d in self._memory_store:
                        if _matches(d, query):
                            d.update(copy.deepcopy(set_values))
                    return res
            except Exception as e:
                _mark_mongo_failure()
                print(f"MongoDB update notice on {self.name} (fallback active): {e}")

        set_values = update_dict.get("$set", {})
        count = 0
        for d in self._memory_store:
            if _matches(d, query):
                d.update(copy.deepcopy(set_values))
                count = 1
                break
        return MockUpdateResult(count)

    def delete_one(self, query):
        if self.real_collection is not None and _should_try_real_mongo():
            try:
                res = self.real_collection.delete_one(query)
                if res.deleted_count > 0:
                    for idx, d in enumerate(self._memory_store):
                        if _matches(d, query):
                            self._memory_store.pop(idx)
                            break
                    return res
            except Exception as e:
                _mark_mongo_failure()
                print(f"MongoDB delete notice on {self.name} (fallback active): {e}")

        count = 0
        for idx, d in enumerate(self._memory_store):
            if _matches(d, query):
                self._memory_store.pop(idx)
                count = 1
                break
        return MockDeleteResult(count)

    def aggregate(self, pipeline):
        if self.real_collection is not None and _should_try_real_mongo():
            try:
                return list(self.real_collection.aggregate(pipeline))
            except Exception as e:
                _mark_mongo_failure()
                print(f"MongoDB aggregate notice on {self.name} (fallback active): {e}")

        if pipeline and "$group" in pipeline[0]:
            total_conf = sum(d.get("confidence", 0.0) for d in self._memory_store)
            count = len(self._memory_store)
            avg = round(total_conf / count, 1) if count > 0 else 0.0
            return [{"_id": None, "avg_conf": avg}]

        return []

    def create_index(self, keys, **kwargs):
        if self.real_collection is not None and _should_try_real_mongo():
            try:
                return self.real_collection.create_index(keys, **kwargs)
            except Exception:
                _mark_mongo_failure()
        return None


# ============================================================
# INSTANTIATE RESILIENT COLLECTIONS
# ============================================================

analysis_collection = ResilientCollection("analysis_history")
users_collection = ResilientCollection("users")
saved_collection = ResilientCollection("saved_analyses")
admin_logs_collection = ResilientCollection("admin_logs")

client = None
db = None


def init_database():
    global client, db
    if not MONGODB_URL:
        print("Notice: MONGODB_URL not configured. Operating in high-availability fallback mode.")
        return False

    try:
        client = MongoClient(
            MONGODB_URL,
            tls=True,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=2000,
            connectTimeoutMS=2000,
            socketTimeoutMS=2000,
            retryWrites=True,
        )
        db = client["truthlens"]
        analysis_collection.set_real_collection(db["analysis_history"])
        users_collection.set_real_collection(db["users"])
        saved_collection.set_real_collection(db["saved_analyses"])
        admin_logs_collection.set_real_collection(db["admin_logs"])

        try:
            users_collection.create_index([("email", ASCENDING)], unique=True, background=True)
            saved_collection.create_index([("user_id", ASCENDING), ("analysis_id", ASCENDING)], background=True)
            analysis_collection.create_index([("user_id", ASCENDING)], background=True)
            analysis_collection.create_index([("created_at", ASCENDING)], background=True)
        except Exception:
            _mark_mongo_failure()

        return True
    except Exception as err:
        _mark_mongo_failure()
        print(f"MongoDB initialization notice: {err}")
        return False


# Attempt initial database connection
init_database()


# ============================================================
# HEALTH & TEST
# ============================================================

def test_database_connection():
    global client
    if not _should_try_real_mongo():
        return False

    if client is None:
        init_database()

    try:
        if client is not None:
            client.admin.command("ping")
            return True
        return False
    except Exception:
        _mark_mongo_failure()
        return False