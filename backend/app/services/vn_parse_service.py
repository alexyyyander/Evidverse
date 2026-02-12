from typing import Any


class VNParseService:
    @staticmethod
    def parse(engine: str, text: str) -> list[dict[str, Any]]:
        e = (engine or "").strip().upper()
        if e == "RENPY":
            return VNParseService._parse_renpy(text)
        if e == "KIRIKIRI":
            return VNParseService._parse_kirikiri(text)
        raise ValueError("Unsupported engine")

    @staticmethod
    def _parse_renpy(text: str) -> list[dict[str, Any]]:
        events: list[dict[str, Any]] = []
        lines = text.splitlines()
        in_menu = False
        current_choices: list[dict[str, Any]] = []

        def flush_menu() -> None:
            nonlocal in_menu, current_choices
            if current_choices:
                events.append({"type": "CHOICE", "choices": current_choices})
            in_menu = False
            current_choices = []

        for raw in lines:
            line = raw.rstrip("\n")
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue

            if stripped.startswith("label ") and stripped.endswith(":"):
                flush_menu()
                name = stripped[len("label ") : -1].strip()
                events.append({"type": "LABEL", "name": name})
                continue

            if stripped == "menu:":
                flush_menu()
                in_menu = True
                continue

            if in_menu:
                if stripped.startswith('"') and stripped.endswith('":'):
                    opt = stripped[1:-2]
                    current_choices.append({"text": opt})
                    continue
                if not line.startswith((" ", "\t")):
                    flush_menu()

            if stripped.startswith("jump "):
                flush_menu()
                target = stripped[len("jump ") :].strip()
                events.append({"type": "JUMP", "target": target})
                continue

            if stripped.startswith('"') and stripped.endswith('"') and len(stripped) >= 2:
                flush_menu()
                events.append({"type": "NARRATION", "text": stripped[1:-1]})
                continue

            if '"' in stripped:
                prefix, rest = stripped.split('"', 1)
                speaker = prefix.strip()
                if rest.endswith('"'):
                    text_content = rest[:-1]
                    flush_menu()
                    if speaker:
                        events.append({"type": "SAY", "speaker": speaker, "text": text_content})
                        continue

        flush_menu()
        return events

    @staticmethod
    def _parse_kirikiri(text: str) -> list[dict[str, Any]]:
        events: list[dict[str, Any]] = []
        for raw in text.splitlines():
            stripped = raw.strip()
            if not stripped or stripped.startswith(";"):
                continue
            if stripped.startswith("*"):
                events.append({"type": "LABEL", "name": stripped[1:].strip()})
                continue
            if stripped.startswith("@say "):
                payload = stripped[len("@say ") :].strip()
                parts = payload.split(" ", 1)
                if len(parts) == 2:
                    speaker = parts[0].strip()
                    text_content = parts[1].strip()
                    events.append({"type": "SAY", "speaker": speaker, "text": text_content})
                else:
                    events.append({"type": "NARRATION", "text": payload})
                continue
            if stripped.startswith("@jump "):
                events.append({"type": "JUMP", "target": stripped[len("@jump ") :].strip()})
                continue
            events.append({"type": "TEXT", "text": stripped})
        return events


vn_parse_service = VNParseService()
