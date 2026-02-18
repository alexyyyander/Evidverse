import ipaddress
import os
import socket
from typing import Iterable, Optional
from urllib.parse import urlparse

import httpx

def _to_host_patterns(allowed_hosts: Optional[Iterable[str]]) -> list[str]:
    if not allowed_hosts:
        return []
    out: list[str] = []
    for raw in allowed_hosts:
        value = str(raw).strip().lower()
        if value:
            out.append(value)
    return out


def _host_matches_pattern(hostname: str, pattern: str) -> bool:
    host = hostname.lower().strip(".")
    pat = pattern.lower().strip(".")
    if not pat:
        return False
    if pat.startswith("*."):
        suffix = pat[2:]
        return bool(suffix) and host.endswith(f".{suffix}")
    return host == pat


def _resolve_host_ips(hostname: str) -> set[str]:
    try:
        infos = socket.getaddrinfo(hostname, None, proto=socket.IPPROTO_TCP)
    except socket.gaierror as e:
        raise ValueError(f"Unable to resolve host: {hostname}") from e
    ips: set[str] = set()
    for info in infos:
        sockaddr = info[4]
        if isinstance(sockaddr, tuple) and len(sockaddr) > 0:
            ip_value = str(sockaddr[0]).strip()
            if ip_value:
                ips.add(ip_value)
    if not ips:
        raise ValueError(f"Host resolved without addresses: {hostname}")
    return ips


def _is_private_or_local_ip(ip_text: str) -> bool:
    ip = ipaddress.ip_address(ip_text)
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def validate_remote_url(
    url: str,
    *,
    allowed_schemes: Optional[Iterable[str]] = None,
    allowed_hosts: Optional[Iterable[str]] = None,
    allow_private_network: bool = True,
    allow_local_file: bool = True,
) -> None:
    value = (url or "").strip()
    if not value:
        raise ValueError("url is required")

    if value.lower().startswith("file://"):
        if not allow_local_file:
            raise ValueError("file:// URLs are not allowed")
        return

    if os.path.isabs(value):
        if not allow_local_file:
            raise ValueError("local absolute paths are not allowed")
        if not os.path.exists(value):
            raise ValueError("local path does not exist")
        return

    parsed = urlparse(value)
    scheme = (parsed.scheme or "").lower()
    if not scheme:
        raise ValueError("URL scheme is required")

    allowed_scheme_set = {str(s).strip().lower() for s in (allowed_schemes or []) if str(s).strip()}
    if allowed_scheme_set and scheme not in allowed_scheme_set:
        joined = ",".join(sorted(allowed_scheme_set))
        raise ValueError(f"URL scheme '{scheme}' is not allowed (allowed: {joined})")

    host = (parsed.hostname or "").strip().lower()
    if not host:
        raise ValueError("URL host is required")

    host_patterns = _to_host_patterns(allowed_hosts)
    if host_patterns and not any(_host_matches_pattern(host, p) for p in host_patterns):
        raise ValueError(f"URL host '{host}' is not in allowlist")

    if allow_private_network:
        return

    if host in {"localhost", "localhost.localdomain"}:
        raise ValueError("Private/loopback hosts are not allowed")
    try:
        ips = _resolve_host_ips(host)
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Unable to resolve host: {host}") from e
    for ip_text in ips:
        if _is_private_or_local_ip(ip_text):
            raise ValueError(f"Host resolves to non-public IP: {ip_text}")


def _read_local_bytes(path: str, max_bytes: Optional[int]) -> bytes:
    with open(path, "rb") as f:
        if max_bytes is None or max_bytes <= 0:
            return f.read()
        data = f.read(max_bytes + 1)
        if len(data) > max_bytes:
            raise ValueError(f"payload exceeds max bytes ({max_bytes})")
        return data


def _read_http_bytes(url: str, timeout: int, max_bytes: Optional[int]) -> bytes:
    headers = {
        "User-Agent": "EvidverseRemoteFetcher/1.0",
        "Accept": "*/*",
    }
    try:
        with httpx.Client(timeout=timeout, follow_redirects=False) as client:
            with client.stream("GET", url, headers=headers) as resp:
                if 300 <= resp.status_code < 400:
                    raise ValueError("redirect responses are not allowed")
                resp.raise_for_status()

                if max_bytes is not None and max_bytes > 0:
                    content_length = resp.headers.get("Content-Length")
                    if content_length:
                        try:
                            declared = int(content_length)
                        except ValueError:
                            declared = None
                        if declared is not None and declared > max_bytes:
                            raise ValueError(f"payload exceeds max bytes ({max_bytes})")

                if max_bytes is None or max_bytes <= 0:
                    return resp.read()

                chunks: list[bytes] = []
                total = 0
                for part in resp.iter_bytes(chunk_size=64 * 1024):
                    total += len(part)
                    if total > max_bytes:
                        raise ValueError(f"payload exceeds max bytes ({max_bytes})")
                    chunks.append(part)
                return b"".join(chunks)
    except httpx.RequestError as e:
        raise ValueError(f"Failed to fetch remote URL: {e}") from e
    except httpx.HTTPStatusError as e:
        raise ValueError(f"Remote URL returned HTTP {e.response.status_code}") from e


def read_bytes_from_url(
    url: str,
    timeout: int = 20,
    max_bytes: Optional[int] = None,
    *,
    allowed_schemes: Optional[Iterable[str]] = None,
    allowed_hosts: Optional[Iterable[str]] = None,
    allow_private_network: bool = True,
    allow_local_file: bool = True,
) -> bytes:
    validate_remote_url(
        url,
        allowed_schemes=allowed_schemes,
        allowed_hosts=allowed_hosts,
        allow_private_network=allow_private_network,
        allow_local_file=allow_local_file,
    )

    value = (url or "").strip()
    if value.lower().startswith("file://"):
        return _read_local_bytes(value[len("file://") :], max_bytes=max_bytes)
    if os.path.isabs(value):
        return _read_local_bytes(value, max_bytes=max_bytes)
    return _read_http_bytes(value, timeout=timeout, max_bytes=max_bytes)
