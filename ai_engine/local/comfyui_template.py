from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict, List, Optional


def _parse_path(path: str) -> List[str | int]:
    parts: List[str | int] = []
    for raw in String(path).split("."):
        p = raw.strip()
        if not p:
            continue
        if p.isdigit():
            parts.append(int(p))
        else:
            parts.append(p)
    return parts


def _set_by_path(obj: Any, path: List[str | int], value: Any) -> None:
    cur = obj
    for i, seg in enumerate(path):
        is_last = i == len(path) - 1
        if is_last:
            if isinstance(seg, int) and isinstance(cur, list):
                while len(cur) <= seg:
                    cur.append(None)
                cur[seg] = value
                return
            if isinstance(seg, str) and isinstance(cur, dict):
                cur[seg] = value
                return
            raise TypeError("unsupported path write")

        nxt = path[i + 1]
        if isinstance(seg, int):
            if not isinstance(cur, list):
                raise TypeError("expected list while walking path")
            while len(cur) <= seg:
                cur.append({} if isinstance(nxt, str) else [])
            if cur[seg] is None:
                cur[seg] = {} if isinstance(nxt, str) else []
            cur = cur[seg]
        else:
            if not isinstance(cur, dict):
                raise TypeError("expected dict while walking path")
            if seg not in cur or cur[seg] is None:
                cur[seg] = {} if isinstance(nxt, str) else []
            cur = cur[seg]


def apply_bindings(workflow: Dict[str, Any], bindings: Optional[List[Dict[str, Any]]], params: Dict[str, Any]) -> Dict[str, Any]:
    wf = deepcopy(workflow)
    if not bindings:
        return wf

    for b in bindings:
        node_id = str(b.get("node_id", "")).strip()
        path_raw = str(b.get("path", "")).strip()
        param_name = str(b.get("param", "")).strip()
        if not node_id or not path_raw or not param_name:
            continue
        if node_id not in wf:
            continue
        if param_name not in params:
            continue
        path = _parse_path(path_raw)
        if not path:
            continue
        _set_by_path(wf[node_id], path, params[param_name])

    return wf


def String(value: Any) -> str:
    return "" if value is None else str(value)

