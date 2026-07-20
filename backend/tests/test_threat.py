"""Unit test blocklist — logika match tanpa ambil feed dari jaringan."""
from __future__ import annotations

from app.threat import Blocklist, in_allowlist, _canon, _host


def test_allowlist_host_persis():
    assert in_allowlist("https://binus.ac.id") is True
    assert in_allowlist("https://www.binus.ac.id/akademik") is True
    assert in_allowlist("https://google.com") is True


def test_allowlist_aman_dari_subdomain_spoof():
    # host beda -> TIDAK boleh ke-allow walau mengandung domain tepercaya
    assert in_allowlist("https://binus.ac.id.evil.com/login") is False
    assert in_allowlist("https://google.com.phish.ru") is False
    assert in_allowlist("https://not-binus.ac.id") is False


def test_canon_dan_host_normalisasi():
    assert _host("https://www.Evil.com/path") == "evil.com"
    assert _host("http://user:pw@evil.com:8080/x") == "evil.com"
    assert _canon("https://evil.com/a/") == _canon("http://www.evil.com/a")


def test_blocklist_kosong_tidak_match():
    bl = Blocklist(enabled=True)
    assert bl.check("https://anything.com") is None
    assert not bl.ready


def test_blocklist_match_url_dan_host():
    bl = Blocklist(enabled=True)
    # isi manual (simulasi hasil load feed), tanpa jaringan
    bl._urls = {_canon("http://evil.com/login")}
    bl._hosts = {"evil.com"}
    bl._count = 1
    assert bl.check("http://evil.com/login") == "url_in_blocklist"
    assert bl.check("https://www.evil.com/login/") == "url_in_blocklist"
    # host sama, path beda -> tetap kena lewat host match
    assert bl.check("http://evil.com/other") == "host_in_blocklist"
    # domain lain -> lolos ke ML
    assert bl.check("https://google.com") is None


def test_blocklist_disabled():
    bl = Blocklist(enabled=False)
    bl._urls = {_canon("http://evil.com/login")}
    bl._hosts = {"evil.com"}
    bl._count = 1
    assert bl.check("http://evil.com/login") is None
