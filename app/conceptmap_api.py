# app/conceptmap_api.py
"""
ConceptMap API endpoints for static content learning platform

Data Structure:
- Subjects and topics are stored in data/conceptmap/subject.json
- Each subject contains an array of topics with id, topic, and path fields
- Static content (images) are stored in data/conceptmap/images/

Caching:
- In-memory cache for subject.json data
- Cache invalidates automatically when subject.json is modified
- Uses file modification time to detect changes
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from typing import List, Dict, Any, Optional
import json
import os
from pathlib import Path

router = APIRouter(prefix="/conceptmap", tags=["conceptmap"])

# Subject metadata (icons and descriptions)
SUBJECT_METADATA = {
    "geography": {"name": "Geography", "icon": "🌍", "description": "Geographical concepts, locations, and spatial relationships"},
    "polity": {"name": "Polity", "icon": "📜", "description": "Constitutional framework, rights, and governance structures"},
    "history": {"name": "History", "icon": "📚", "description": "Historical events, timelines, and significant occurrences"},
    "economy": {"name": "Economy", "icon": "💰", "description": "Economic systems, processes, and financial flows"},
    "science": {"name": "Science", "icon": "🔬", "description": "Scientific concepts, systems, and layered structures"},
}


def get_conceptmap_data_path() -> Path:
    """Get the path to the conceptmap data directory"""
    project_root = Path(__file__).parent.parent
    conceptmap_dir = project_root / "data" / "conceptmap"
    return conceptmap_dir


def get_subject_json_path() -> Path:
    """Get the path to the subject.json file"""
    return get_conceptmap_data_path() / "subject.json"


def get_topics_dir_path() -> Path:
    """Get the path to the topics directory"""
    return get_conceptmap_data_path() / "topics"


# ============================================================================
# IN-MEMORY CACHE FOR SUBJECT.JSON
# ============================================================================
# Cache Name: "conceptmap_subject_cache"
# Cache Type: Single shared cache (not keyed per user)
# Cache Structure:
#   - _subject_data_cache: Dictionary with subjects and topics from subject.json
#   - _subject_json_mtime: Timestamp of last file modification (for invalidation)
# ============================================================================

# In-memory cache for subject.json
_subject_data_cache: Optional[Dict[str, Any]] = None
_subject_json_mtime: Optional[float] = None


def _get_subject_json_mtime() -> float:
    """Get the modification time of subject.json file"""
    subject_json = get_subject_json_path()
    if not subject_json.exists():
        return 0.0
    try:
        return subject_json.stat().st_mtime
    except OSError:
        return 0.0


def _is_cache_valid() -> bool:
    """Check if the cache is still valid by comparing file modification times"""
    global _subject_data_cache, _subject_json_mtime
    
    if _subject_data_cache is None or _subject_json_mtime is None:
        return False
    
    current_mtime = _get_subject_json_mtime()
    return current_mtime == _subject_json_mtime


def load_subject_data(force_reload: bool = False) -> Dict[str, Any]:
    """
    Load subject.json file.
    Uses in-memory cache to avoid repeated file reads.
    
    Args:
        force_reload: If True, bypass cache and reload from disk
    
    Returns:
        Dictionary with subjects as keys and topics as arrays
    """
    global _subject_data_cache, _subject_json_mtime
    
    # Check cache validity
    if not force_reload and _is_cache_valid():
        return _subject_data_cache
    
    # Cache miss or invalid - reload from disk
    subject_json = get_subject_json_path()
    
    if not subject_json.exists():
        _subject_data_cache = {}
        _subject_json_mtime = 0.0
        return {}
    
    try:
        with open(subject_json, 'r', encoding='utf-8') as f:
            data = json.load(f)
            _subject_data_cache = data
            _subject_json_mtime = _get_subject_json_mtime()
            return data
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error: Failed to load subject.json: {str(e)}")
        _subject_data_cache = {}
        _subject_json_mtime = 0.0
        return {}


def get_subjects_from_json() -> List[str]:
    """
    Extract subject keys from subject.json and topics/*.json files.
    Returns a sorted list of unique subject IDs.
    """
    subjects = set()
    
    # Get subjects from subject.json
    subject_data = load_subject_data()
    subjects.update(subject_data.keys())
    
    # Get subjects from topics/*.json files
    topics_dir = get_topics_dir_path()
    if topics_dir.exists():
        for topic_file in topics_dir.glob("*.json"):
            try:
                with open(topic_file, 'r', encoding='utf-8') as f:
                    topic_data = json.load(f)
                    if "subject" in topic_data:
                        subjects.add(topic_data["subject"])
            except (json.JSONDecodeError, IOError) as e:
                print(f"Warning: Failed to load topic file {topic_file}: {str(e)}")
                continue
    
    return sorted(list(subjects))


@router.get("/subjects")
async def get_subjects() -> Dict[str, List[Dict[str, Any]]]:
    """
    Get all available subjects for ConceptMap.
    Subjects are read from subject.json file.
    
    Returns:
        Dictionary with "subjects" key containing list of subjects with metadata
    """
    try:
        # Get unique subjects from subject.json
        subject_ids = get_subjects_from_json()
        
        # Build subject list with metadata
        subjects = []
        for subject_id in subject_ids:
            metadata = SUBJECT_METADATA.get(subject_id, {
                "name": subject_id.capitalize(),
                "icon": "📖",
                "description": f"Topics related to {subject_id}"
            })
            subjects.append({
                "id": subject_id,
                "name": metadata["name"],
                "icon": metadata["icon"],
                "description": metadata["description"]
            })
        
        return {"subjects": subjects}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading subjects: {str(e)}")


@router.get("/topics/{subject}")
async def get_topics(subject: str) -> Dict[str, List[Dict[str, Any]]]:
    """
    Get all topics for a specific subject.
    Combines topics from subject.json (static images) and topics/*.json (interactive visuals).
    
    Args:
        subject: Subject ID (e.g., "geography", "polity", "history")
    
    Returns:
        Dictionary with "topics" key containing list of topics for the subject
    """
    try:
        topics_list = []
        
        # Load static topics from subject.json
        subject_data = load_subject_data()
        
        if subject in subject_data:
            for topic in subject_data[subject]:
                topics_list.append({
                    "id": str(topic.get("id", "")),
                    "title": topic.get("topic", ""),
                    "description": "",  # Not in subject.json structure
                    "visualType": "static",  # All topics from subject.json are static
                    "path": topic.get("path", ""),  # Include path for static content
                })
        
        # Load JSON-based topics from topics/ directory
        topics_dir = get_topics_dir_path()
        if topics_dir.exists():
            for topic_file in topics_dir.glob("*.json"):
                try:
                    with open(topic_file, 'r', encoding='utf-8') as f:
                        topic_data = json.load(f)
                        
                        # Only include topics for the requested subject
                        if topic_data.get("subject") == subject:
                            topics_list.append({
                                "id": topic_data.get("id", ""),
                                "title": topic_data.get("title", ""),
                                "description": topic_data.get("description", ""),
                                "visualType": topic_data.get("visualType", "static"),
                            })
                except (json.JSONDecodeError, IOError) as e:
                    print(f"Warning: Failed to load topic file {topic_file}: {str(e)}")
                    continue
        
        return {"topics": topics_list}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading topics: {str(e)}")


@router.get("/topic/{topic_id}")
async def get_topic_details(topic_id: str, subject: Optional[str] = None) -> Dict[str, Any]:
    """
    Get detailed information for a specific topic.
    First checks for JSON file in topics/ directory.
    Falls back to subject.json if not found.
    
    Args:
        topic_id: Topic ID to retrieve (as string, matching the id field)
        subject: Optional subject ID to narrow search (for validation)
    
    Returns:
        Topic details with full data structure
    """
    try:
        # First, try to load from topics directory (JSON-based topics)
        topics_dir = get_topics_dir_path()
        topic_file = topics_dir / f"{topic_id}.json"
        
        if topic_file.exists():
            try:
                with open(topic_file, 'r', encoding='utf-8') as f:
                    topic_data = json.load(f)
                    
                    # Validate subject if provided
                    if subject and topic_data.get("subject") != subject:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Topic '{topic_id}' does not belong to subject '{subject}'"
                        )
                    
                    return topic_data
            except json.JSONDecodeError as e:
                print(f"Error: Failed to parse topic file {topic_file}: {str(e)}")
                # Fall through to subject.json
        
        # Fall back to subject.json for static image topics
        subject_data = load_subject_data()
        
        # Search for topic across all subjects
        found_topic = None
        found_subject = None
        
        for subj_id, topics in subject_data.items():
            for topic in topics:
                if str(topic.get("id", "")) == str(topic_id):
                    found_topic = topic
                    found_subject = subj_id
                    break
            if found_topic:
                break
        
        if not found_topic:
            raise HTTPException(status_code=404, detail=f"Topic '{topic_id}' not found")
        
        # Validate subject if provided
        if subject and found_subject != subject:
            raise HTTPException(
                status_code=400,
                detail=f"Topic '{topic_id}' does not belong to subject '{subject}'"
            )
        
        # Return topic info in expected format
        return {
            "id": str(found_topic.get("id", "")),
            "subject": found_subject,
            "title": found_topic.get("topic", ""),
            "path": found_topic.get("path", ""),
            "visualType": "static",
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading topic: {str(e)}")


@router.get("/topics")
async def get_all_topics() -> Dict[str, List[Dict[str, Any]]]:
    """
    Get all topics across all subjects.
    Useful for search or admin purposes.
    
    Returns:
        Dictionary with "topics" key containing all topics
    """
    try:
        subject_data = load_subject_data()
        all_topics = []
        
        for subject_id, topics in subject_data.items():
            for topic in topics:
                all_topics.append({
                    "id": str(topic.get("id", "")),
                    "subject": subject_id,
                    "title": topic.get("topic", ""),
                    "path": topic.get("path", ""),
                })
        
        return {"topics": all_topics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading topics: {str(e)}")


@router.get("/static/{path:path}")
async def get_static_content(path: str):
    """
    Get static content (images) for topics.
    Serves files from the conceptmap/images/ directory.
    
    Args:
        path: Relative path to the image file (e.g., "tiger-reserves.png")
    
    Returns:
        Image file content with appropriate content-type header
    """
    try:
        # Security: prevent directory traversal
        if ".." in path or path.startswith("/"):
            raise HTTPException(status_code=400, detail="Invalid path")
        
        images_dir = get_conceptmap_data_path() / "images"
        image_file = images_dir / path
        
        if not image_file.exists():
            raise HTTPException(status_code=404, detail=f"Static content '{path}' not found")
        
        # Determine media type based on file extension
        ext = image_file.suffix.lower()
        media_types = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
            ".webp": "image/webp",
        }
        media_type = media_types.get(ext, "application/octet-stream")
        
        return FileResponse(
            path=image_file,
            media_type=media_type,
            filename=path
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving static content: {str(e)}")


@router.post("/cache/clear")
async def clear_cache():
    """
    Clear the in-memory cache for subject.json.
    Useful for development or when subject.json is updated externally.
    
    Admin Endpoint: POST /conceptmap/cache/clear
    
    Returns:
        Success message with cache details
    """
    global _subject_data_cache, _subject_json_mtime
    
    cache_size = len(_subject_data_cache) if _subject_data_cache else 0
    was_cached = _subject_data_cache is not None
    
    _subject_data_cache = None
    _subject_json_mtime = None
    
    return {
        "message": "Cache cleared successfully",
        "status": "success",
        "cache_name": "conceptmap_subject_cache",
        "cache_type": "shared_in_memory",
        "subjects_cleared": cache_size,
        "was_cached": was_cached
    }


@router.get("/cache/status")
async def get_cache_status():
    """
    Get the current cache status and statistics.
    Useful for debugging, monitoring, and admin maintenance.
    
    Admin Endpoint: GET /conceptmap/cache/status
    
    Returns:
        Detailed cache status information including:
        - Cache name and type
        - Cache validity
        - Number of subjects cached
        - File modification times
        - Memory usage estimate
    """
    global _subject_data_cache, _subject_json_mtime
    
    is_valid = _is_cache_valid()
    cache_size = len(_subject_data_cache) if _subject_data_cache else 0
    
    # Estimate memory usage (rough calculation)
    import sys
    memory_size = sys.getsizeof(_subject_data_cache) if _subject_data_cache else 0
    if _subject_data_cache:
        # Add size of each subject and topic
        for subject, topics in _subject_data_cache.items():
            memory_size += sys.getsizeof(subject)
            if isinstance(topics, list):
                for topic in topics:
                    memory_size += sys.getsizeof(topic)
                    if isinstance(topic, dict):
                        for key, value in topic.items():
                            memory_size += sys.getsizeof(key) + sys.getsizeof(value)
    
    # Format timestamps
    from datetime import datetime
    last_modified_str = None
    current_mtime_str = None
    if _subject_json_mtime:
        last_modified_str = datetime.fromtimestamp(_subject_json_mtime).isoformat()
    current_mtime = _get_subject_json_mtime()
    if current_mtime:
        current_mtime_str = datetime.fromtimestamp(current_mtime).isoformat()
    
    return {
        "cache_name": "conceptmap_subject_cache",
        "cache_type": "shared_in_memory",
        "cache_key": "N/A (single cache for subject.json)",
        "cached": _subject_data_cache is not None,
        "valid": is_valid,
        "subjects_count": cache_size,
        "memory_size_bytes": memory_size,
        "memory_size_mb": round(memory_size / (1024 * 1024), 2),
        "last_modified_timestamp": _subject_json_mtime,
        "last_modified_iso": last_modified_str,
        "current_mtime_timestamp": current_mtime,
        "current_mtime_iso": current_mtime_str,
        "needs_refresh": not is_valid if _subject_data_cache else False
    }


@router.post("/cache/refresh")
async def refresh_cache():
    """
    Force refresh the cache by reloading subject.json from disk.
    Useful when you know subject.json has changed but cache hasn't auto-invalidated.
    
    Admin Endpoint: POST /conceptmap/cache/refresh
    
    Returns:
        Success message with refresh details
    """
    global _subject_data_cache, _subject_json_mtime
    
    old_cache_size = len(_subject_data_cache) if _subject_data_cache else 0
    
    # Force reload
    subject_data = load_subject_data(force_reload=True)
    new_cache_size = len(subject_data)
    
    return {
        "message": "Cache refreshed successfully",
        "status": "success",
        "cache_name": "conceptmap_subject_cache",
        "old_subjects_count": old_cache_size,
        "new_subjects_count": new_cache_size,
        "subjects_added": new_cache_size - old_cache_size
    }
