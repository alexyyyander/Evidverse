import pytest

from app.schemas.storyboard import validate_storyboard


def test_validate_storyboard_ok():
    data = [
        {"scene_number": 1, "visual_description": "A", "narration": "N"},
        {"scene_number": 2, "visual_description": "B", "narration": "M"},
    ]
    out = validate_storyboard(data)
    assert isinstance(out, list)
    assert out[0]["scene_number"] == 1


def test_validate_storyboard_rejects_missing_fields():
    with pytest.raises(ValueError) as e:
        validate_storyboard([{"scene_number": 1, "narration": "N"}])
    assert "visual_description" in str(e.value)


def test_validate_storyboard_rejects_empty_strings():
    with pytest.raises(ValueError):
        validate_storyboard([{"scene_number": 1, "visual_description": "   ", "narration": "N"}])

