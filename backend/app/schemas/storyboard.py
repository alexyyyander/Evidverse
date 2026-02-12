from __future__ import annotations

from typing import Any, List

from pydantic import BaseModel, Field, TypeAdapter, ValidationError, field_validator


class StoryboardScene(BaseModel):
    scene_number: int = Field(ge=1)
    visual_description: str = Field(min_length=1)
    narration: str = Field(min_length=1)

    @field_validator("visual_description", "narration")
    @classmethod
    def _strip_non_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Must not be empty")
        return v


_StoryboardAdapter = TypeAdapter(List[StoryboardScene])


def validate_storyboard(data: Any) -> List[dict]:
    try:
        scenes = _StoryboardAdapter.validate_python(data)
    except ValidationError as e:
        parts: list[str] = []
        for err in e.errors():
            loc = ".".join(str(p) for p in err.get("loc", []))
            msg = err.get("msg", "Invalid value")
            parts.append(f"{loc}: {msg}")
        message = "; ".join(parts) if parts else "Invalid storyboard schema"
        raise ValueError(message) from e
    return [s.model_dump() for s in scenes]

