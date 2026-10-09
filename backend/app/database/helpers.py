from bson import ObjectId

def oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception as exc:
        raise ValueError("Invalid id") from exc

def public_user(doc: dict | None) -> dict | None:
    if doc is None:
        return None
    result = dict(doc)
    result["id"] = str(result.pop("_id", result.get("id")))
    return result

def public_doc(doc: dict | None) -> dict | None:
    if doc is None:
        return None
    result = dict(doc)
    result["id"] = str(result.pop("_id", result.get("id")))
    return result
