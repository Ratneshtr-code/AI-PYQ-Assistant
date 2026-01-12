# app/conceptmap_api.py
"""
ConceptMap API endpoints for visual learning platform

Data Structure:
- Topics are stored as individual JSON files in data/conceptmap/topics/
- Each topic file contains: id, subject, title, description, visualType, data
- Subjects are dynamically extracted from topic files (not hardcoded)

Caching:
- In-memory cache for topics list and subjects
- Cache invalidates automatically when files are modified
- Uses file modification times to detect changes
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


# ============================================================================
# IN-MEMORY CACHE FOR CONCEPTMAP TOPICS
# ============================================================================
# Cache Name: "conceptmap_topics_cache"
# Cache Type: Single shared cache (not keyed per user)
# Cache Key: N/A (single cache for all topics)
# Cache Structure:
#   - _topics_cache: List of all topic objects from JSON files
#   - _topics_dir_mtime: Timestamp of last file modification (for invalidation)
# ============================================================================

# In-memory cache for topics and file modification times
# Cache Name: "conceptmap_topics_cache"
_topics_cache: Optional[List[Dict[str, Any]]] = None
_topics_dir_mtime: Optional[float] = None


def _get_topics_dir_mtime() -> float:
    """Get the latest modification time of any file in the topics directory"""
    topics_dir = get_conceptmap_data_path() / "topics"
    if not topics_dir.exists():
        return 0.0
    
    max_mtime = 0.0
    for topic_file in topics_dir.glob("*.json"):
        try:
            mtime = topic_file.stat().st_mtime
            max_mtime = max(max_mtime, mtime)
        except OSError:
            continue
    
    return max_mtime


def _is_cache_valid() -> bool:
    """Check if the cache is still valid by comparing file modification times"""
    global _topics_cache, _topics_dir_mtime
    
    if _topics_cache is None or _topics_dir_mtime is None:
        return False
    
    current_mtime = _get_topics_dir_mtime()
    return current_mtime == _topics_dir_mtime


def load_all_topics(force_reload: bool = False) -> List[Dict[str, Any]]:
    """
    Load all topic files from the topics directory.
    Uses in-memory cache to avoid repeated file system scans.
    
    Args:
        force_reload: If True, bypass cache and reload from disk
    
    Returns:
        List of topic objects
    """
    global _topics_cache, _topics_dir_mtime
    
    # Check cache validity
    if not force_reload and _is_cache_valid():
        return _topics_cache
    
    # Cache miss or invalid - reload from disk
    topics_dir = get_conceptmap_data_path() / "topics"
    topics = []
    
    if not topics_dir.exists():
        _topics_cache = []
        _topics_dir_mtime = 0.0
        return topics
    
    # Scan all JSON files in topics directory
    for topic_file in topics_dir.glob("*.json"):
        try:
            with open(topic_file, 'r', encoding='utf-8') as f:
                topic_data = json.load(f)
                # Validate required fields
                if "id" in topic_data and "subject" in topic_data:
                    topics.append(topic_data)
        except (json.JSONDecodeError, IOError) as e:
            # Skip invalid files, log error
            print(f"Warning: Failed to load topic file {topic_file.name}: {str(e)}")
            continue
    
    # Update cache
    _topics_cache = topics
    _topics_dir_mtime = _get_topics_dir_mtime()
    
    return topics


def get_subjects_from_topics() -> List[str]:
    """
    Extract unique subjects from all topic files.
    Uses cached topics if available.
    Returns a sorted list of subject IDs.
    """
    topics = load_all_topics()
    subjects = set()
    
    for topic in topics:
        if "subject" in topic:
            subjects.add(topic["subject"])
    
    return sorted(list(subjects))


@router.get("/subjects")
async def get_subjects() -> Dict[str, List[Dict[str, Any]]]:
    """
    Get all available subjects for ConceptMap.
    Subjects are dynamically extracted from topic files.
    
    Returns:
        Dictionary with "subjects" key containing list of subjects with metadata
    """
    try:
        # Get unique subjects from topics
        subject_ids = get_subjects_from_topics()
        
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
        raise HTTPException(status_code=500, detail=f"Error extracting subjects: {str(e)}")


@router.get("/topics/{subject}")
async def get_topics(subject: str) -> Dict[str, List[Dict[str, Any]]]:
    """
    Get all topics for a specific subject.
    Topics are loaded from individual JSON files in the topics directory.
    
    Args:
        subject: Subject ID (e.g., "geography", "polity", "history")
    
    Returns:
        Dictionary with "topics" key containing list of topics for the subject
    """
    try:
        # Load all topics and filter by subject
        all_topics = load_all_topics()
        subject_topics = [
            topic for topic in all_topics
            if topic.get("subject") == subject
        ]
        
        # Remove the 'subject' field from response (already known from URL)
        # Keep only essential fields for list view
        topics_list = []
        for topic in subject_topics:
            topics_list.append({
                "id": topic.get("id"),
                "title": topic.get("title"),
                "description": topic.get("description"),
                "visualType": topic.get("visualType"),
            })
        
        return {"topics": topics_list}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading topics: {str(e)}")


@router.get("/topic/{topic_id}")
async def get_topic_details(topic_id: str, subject: Optional[str] = None) -> Dict[str, Any]:
    """
    Get detailed information for a specific topic.
    First checks cache, then loads from file if not cached.
    
    Args:
        topic_id: Topic ID to retrieve (filename without .json extension)
        subject: Optional subject ID to narrow search (for validation)
    
    Returns:
        Complete topic details including full data structure
    """
    try:
        # Try to get from cache first (faster)
        cached_topics = load_all_topics()
        cached_topic = next((t for t in cached_topics if t.get("id") == topic_id), None)
        
        if cached_topic:
            # Validate subject if provided
            if subject and cached_topic.get("subject") != subject:
                raise HTTPException(
                    status_code=400,
                    detail=f"Topic '{topic_id}' does not belong to subject '{subject}'"
                )
            return cached_topic
        
        # Not in cache, load from file (shouldn't happen often, but handles edge cases)
        topics_dir = get_conceptmap_data_path() / "topics"
        topic_file = topics_dir / f"{topic_id}.json"
        
        if not topic_file.exists():
            raise HTTPException(status_code=404, detail=f"Topic '{topic_id}' not found")
        
        with open(topic_file, 'r', encoding='utf-8') as f:
            topic_data = json.load(f)
        
        # Validate subject if provided
        if subject and topic_data.get("subject") != subject:
            raise HTTPException(
                status_code=400,
                detail=f"Topic '{topic_id}' does not belong to subject '{subject}'"
            )
        
        return topic_data
    
    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Invalid JSON in topic file: {str(e)}")
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
        all_topics = load_all_topics()
        return {"topics": all_topics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading topics: {str(e)}")


@router.get("/map/india-map.svg")
async def get_india_map():
    """
    Get the India map SVG file.
    Serves the SVG file from the conceptmap data directory.
    
    Returns:
        SVG file content with appropriate content-type header
    """
    try:
        data_path = get_conceptmap_data_path()
        map_file = data_path / "maps" / "india-map.svg"
        
        if not map_file.exists():
            raise HTTPException(status_code=404, detail="India map SVG file not found")
        
        return FileResponse(
            path=map_file,
            media_type="image/svg+xml",
            filename="india-map.svg"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving map file: {str(e)}")


@router.post("/cache/clear")
async def clear_cache():
    """
    Clear the in-memory cache for topics.
    Useful for development or when topics are updated externally.
    
    Admin Endpoint: POST /conceptmap/cache/clear
    
    Returns:
        Success message with cache details
    """
    global _topics_cache, _topics_dir_mtime
    
    cache_size = len(_topics_cache) if _topics_cache else 0
    was_cached = _topics_cache is not None
    
    _topics_cache = None
    _topics_dir_mtime = None
    
    return {
        "message": "Cache cleared successfully",
        "status": "success",
        "cache_name": "conceptmap_topics_cache",
        "cache_type": "shared_in_memory",
        "topics_cleared": cache_size,
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
        - Number of topics cached
        - File modification times
        - Memory usage estimate
    """
    global _topics_cache, _topics_dir_mtime
    
    is_valid = _is_cache_valid()
    cache_size = len(_topics_cache) if _topics_cache else 0
    
    # Estimate memory usage (rough calculation)
    import sys
    memory_size = sys.getsizeof(_topics_cache) if _topics_cache else 0
    if _topics_cache:
        # Add size of each topic object
        for topic in _topics_cache:
            memory_size += sys.getsizeof(topic)
            if isinstance(topic, dict):
                for key, value in topic.items():
                    memory_size += sys.getsizeof(key) + sys.getsizeof(value)
    
    # Format timestamps
    from datetime import datetime
    last_modified_str = None
    current_mtime_str = None
    if _topics_dir_mtime:
        last_modified_str = datetime.fromtimestamp(_topics_dir_mtime).isoformat()
    current_mtime = _get_topics_dir_mtime()
    if current_mtime:
        current_mtime_str = datetime.fromtimestamp(current_mtime).isoformat()
    
    return {
        "cache_name": "conceptmap_topics_cache",
        "cache_type": "shared_in_memory",
        "cache_key": "N/A (single cache for all topics)",
        "cached": _topics_cache is not None,
        "valid": is_valid,
        "topics_count": cache_size,
        "memory_size_bytes": memory_size,
        "memory_size_mb": round(memory_size / (1024 * 1024), 2),
        "last_modified_timestamp": _topics_dir_mtime,
        "last_modified_iso": last_modified_str,
        "current_mtime_timestamp": current_mtime,
        "current_mtime_iso": current_mtime_str,
        "needs_refresh": not is_valid if _topics_cache else False
    }


@router.post("/cache/refresh")
async def refresh_cache():
    """
    Force refresh the cache by reloading all topics from disk.
    Useful when you know files have changed but cache hasn't auto-invalidated.
    
    Admin Endpoint: POST /conceptmap/cache/refresh
    
    Returns:
        Success message with refresh details
    """
    global _topics_cache, _topics_dir_mtime
    
    old_cache_size = len(_topics_cache) if _topics_cache else 0
    
    # Force reload
    topics = load_all_topics(force_reload=True)
    new_cache_size = len(topics)
    
    return {
        "message": "Cache refreshed successfully",
        "status": "success",
        "cache_name": "conceptmap_topics_cache",
        "old_topics_count": old_cache_size,
        "new_topics_count": new_cache_size,
        "topics_added": new_cache_size - old_cache_size
    }
