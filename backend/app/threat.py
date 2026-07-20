"""Sinyal ancaman non-ML: blocklist (Level 3) + umur domain via RDAP (Level 4).

Dipakai backend SEBELUM/BARENG model:
- Blocklist: kalau URL/host persis ada di feed phishing publik yang masih aktif,
  langsung vonis PHISHING tanpa nebak (ML jadi fallback buat yang belum kelihatan).
- RDAP: umur domain sebagai sinyal tambahan di response (domain super baru = mencurigakan).
  Best-effort, ada timeout ketat + cache, TIDAK pernah nge-block prediksi kalau lambat/gagal.

Desain sengaja tahan-offline: kalau feed/RDAP tidak bisa diambil (mis. Space tanpa
outbound), semuanya nonaktif diam-diam dan backend tetap jalan pakai ML saja.
"""
from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timezone
from urllib.parse import urlsplit

logger = logging.getLogger("phishguard")

_FEEDS = (
    "https://openphish.com/feed.txt",
    "https://phishunt.io/feed.txt",
)
_FEED_TIMEOUT = 8
_REFRESH_SECONDS = 3600  # refresh feed tiap 1 jam


def _host(url: str) -> str:
    try:
        netloc = urlsplit(url if "://" in url else "http://" + url).netloc.lower()
    except ValueError:
        return ""
    # buang userinfo & port
    if "@" in netloc:
        netloc = netloc.split("@", 1)[1]
    if ":" in netloc:
        netloc = netloc.split(":", 1)[0]
    # Buang prefix "www." (removeprefix, BUKAN lstrip yang strip per-karakter).
    return netloc.removeprefix("www.")


def _canon(url: str) -> str:
    """Bentuk kanonik buat exact-match: tanpa skema, tanpa trailing slash, lowercase host."""
    try:
        p = urlsplit(url if "://" in url else "http://" + url)
    except ValueError:
        return url.strip().lower()
    host = _host(url)
    tail = (p.path or "").rstrip("/")
    if p.query:
        tail += "?" + p.query
    return host + tail


# Domain tepercaya terkurasi (institusi/brand besar). Fungsi: cegah FALSE POSITIVE
# di situs yang jelas sah tapi model kurang yakin (mis. binus.ac.id yang jarang
# muncul di data training). Pola standar industri (browser & filter email pakai
# allowlist juga). MATCH HOST PERSIS (setelah buang "www.") supaya subdomain
# nyamar seperti "binus.ac.id.evil.com" TIDAK ikut ter-allow (host-nya beda).
_ALLOWLIST = frozenset({
    # Universitas
    "binus.ac.id", "ui.ac.id", "itb.ac.id", "ugm.ac.id", "its.ac.id",
    "unpad.ac.id", "undip.ac.id", "ipb.ac.id", "gunadarma.ac.id", "telkomuniversity.ac.id",
    "uajy.ac.id", "atmajaya.ac.id", "unair.ac.id", "brawijaya.ac.id", "unhas.ac.id",
    "usu.ac.id", "uns.ac.id", "uii.ac.id", "petra.ac.id", "president.ac.id",
    # Pemerintah
    "kemdikbud.go.id", "kemenkeu.go.id", "pajak.go.id", "bps.go.id", "kemkes.go.id",
    "kominfo.go.id", "bi.go.id", "ojk.go.id", "imigrasi.go.id", "polri.go.id",
    # Bank & finansial
    "bca.co.id", "bri.co.id", "bni.co.id", "mandiri.co.id", "cimbniaga.co.id",
    "danamon.co.id", "btn.co.id", "ocbc.id",
    # E-commerce & layanan besar
    "tokopedia.com", "shopee.co.id", "bukalapak.com", "blibli.com", "lazada.co.id",
    "gojek.com", "traveloka.com", "tiket.com", "dana.id",
    # Global majors (biar tidak pernah salah vonis brand terkenal)
    "google.com", "youtube.com", "facebook.com", "instagram.com", "microsoft.com",
    "apple.com", "amazon.com", "github.com", "wikipedia.org", "netflix.com",
})


def in_allowlist(url: str) -> bool:
    """True kalau HOST persis ada di allowlist tepercaya (aman dari subdomain spoof)."""
    return _host(url) in _ALLOWLIST


class Blocklist:
    """Set URL/host phishing dari feed publik. Thread-safe, auto-refresh."""

    def __init__(self, enabled: bool = True) -> None:
        self._enabled = enabled
        self._urls: set[str] = set()
        self._hosts: set[str] = set()
        self._lock = threading.Lock()
        self._loaded_at: float = 0.0
        self._count = 0

    @property
    def ready(self) -> bool:
        return self._count > 0

    @property
    def size(self) -> int:
        return self._count

    def load(self) -> None:
        if not self._enabled:
            return
        import urllib.request

        urls: set[str] = set()
        hosts: set[str] = set()
        for feed in _FEEDS:
            try:
                req = urllib.request.Request(feed, headers={"User-Agent": "PhishGuard/2.2"})
                with urllib.request.urlopen(req, timeout=_FEED_TIMEOUT) as r:
                    text = r.read().decode("utf-8", errors="replace")
            except Exception as exc:
                logger.warning("Gagal ambil feed %s: %s", feed, exc)
                continue
            for line in text.splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                urls.add(_canon(line))
                h = _host(line)
                if h:
                    hosts.add(h)
        if urls:
            with self._lock:
                self._urls, self._hosts = urls, hosts
                self._count = len(urls)
                self._loaded_at = time.time()
            logger.info("Blocklist dimuat: %d URL, %d host", len(urls), len(hosts))

    def maybe_refresh(self) -> None:
        if self._enabled and time.time() - self._loaded_at > _REFRESH_SECONDS:
            threading.Thread(target=self.load, daemon=True).start()

    def check(self, url: str) -> str | None:
        """Return alasan kalau URL/host ada di blocklist, else None."""
        if not self._enabled or self._count == 0:
            return None
        with self._lock:
            if _canon(url) in self._urls:
                return "url_in_blocklist"
            if _host(url) in self._hosts:
                return "host_in_blocklist"
        return None


class DomainAge:
    """Umur domain via RDAP. Best-effort, cache, timeout ketat. Tidak pernah nge-block."""

    def __init__(self, enabled: bool = True, timeout: float = 2.5) -> None:
        self._enabled = enabled
        self._timeout = timeout
        self._cache: dict[str, int | None] = {}
        self._lock = threading.Lock()

    def days(self, url: str) -> int | None:
        if not self._enabled:
            return None
        host = _host(url)
        if not host or host.replace(".", "").isdigit():  # IP address, skip
            return None
        with self._lock:
            if host in self._cache:
                return self._cache[host]
        age = self._query(host)
        with self._lock:
            self._cache[host] = age
        return age

    def _query(self, host: str) -> int | None:
        import json
        import urllib.request

        try:
            url = f"https://rdap.org/domain/{host}"
            req = urllib.request.Request(url, headers={"User-Agent": "PhishGuard/2.2"})
            with urllib.request.urlopen(req, timeout=self._timeout) as r:
                data = json.loads(r.read().decode("utf-8", errors="replace"))
            for ev in data.get("events", []):
                if ev.get("eventAction") == "registration":
                    reg = ev.get("eventDate", "").replace("Z", "+00:00")
                    dt = datetime.fromisoformat(reg)
                    delta = datetime.now(timezone.utc) - dt.astimezone(timezone.utc)
                    return max(delta.days, 0)
        except Exception:
            return None
        return None
