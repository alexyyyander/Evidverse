import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.projects import _enforce_story_boundary_lock_update


def _workspace(
    *,
    boundary: int | None,
    locked_summary: str = "locked-summary",
    unlocked_summary: str = "open-summary",
    locked_narration: str = "locked narration",
    include_story_workflow: bool = True,
):
    editor_state = {
        "beats": {
            "beat_locked": {"id": "beat_locked", "narration": locked_narration},
            "beat_open": {"id": "beat_open", "narration": "open narration"},
        }
    }
    if include_story_workflow:
        editor_state["storyWorkflow"] = {
            "branchPolicy": {
                "branchName": "fork/demo",
                "lockBoundaryOrder": boundary,
                "boundaryConfigured": boundary is not None,
            },
            "nodes": [
                {
                    "id": "node_locked",
                    "order": 0,
                    "locked": True,
                    "beatIds": ["beat_locked"],
                    "step2": {"summary": locked_summary},
                    "step3": {"status": "done"},
                    "step4": {"status": "done", "confirmed": True},
                },
                {
                    "id": "node_open",
                    "order": 1,
                    "locked": False,
                    "beatIds": ["beat_open"],
                    "step2": {"summary": unlocked_summary},
                    "step3": {"status": "todo"},
                    "step4": {"status": "todo", "confirmed": False},
                },
            ],
        }
    return {"editorState": editor_state}


def test_story_lock_allows_when_no_previous_boundary():
    prev = _workspace(boundary=None)
    nxt = _workspace(boundary=0, unlocked_summary="changed")
    _enforce_story_boundary_lock_update(prev, nxt)


def test_story_lock_rejects_boundary_backward_move():
    prev = _workspace(boundary=1)
    nxt = _workspace(boundary=0)
    with pytest.raises(HTTPException, match="cannot move backward"):
        _enforce_story_boundary_lock_update(prev, nxt)


def test_story_lock_rejects_locked_node_change():
    prev = _workspace(boundary=1)
    nxt = _workspace(boundary=1, locked_summary="rewritten")
    with pytest.raises(HTTPException, match="immutable"):
        _enforce_story_boundary_lock_update(prev, nxt)


def test_story_lock_rejects_locked_beat_change():
    prev = _workspace(boundary=1)
    nxt = _workspace(boundary=1, locked_narration="rewritten narration")
    with pytest.raises(HTTPException, match="Locked beat"):
        _enforce_story_boundary_lock_update(prev, nxt)


def test_story_lock_allows_unlocked_node_change():
    prev = _workspace(boundary=1)
    nxt = _workspace(boundary=1, unlocked_summary="rewritten open node")
    _enforce_story_boundary_lock_update(prev, nxt)


def test_story_lock_requires_story_workflow_when_boundary_exists():
    prev = _workspace(boundary=1)
    nxt = _workspace(boundary=1, include_story_workflow=False)
    with pytest.raises(HTTPException, match="storyWorkflow is required"):
        _enforce_story_boundary_lock_update(prev, nxt)
