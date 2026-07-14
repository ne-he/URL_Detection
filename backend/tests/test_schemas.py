from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas import URLRequest


def test_valid_url_passes():
    assert URLRequest(url="https://www.google.com").url == "https://www.google.com"


def test_host_is_lowercased():
    assert URLRequest(url="https://WWW.Google.COM/Path").url == "https://www.google.com/Path"


def test_scheme_added_when_missing():
    assert URLRequest(url="example.com/login").url == "http://example.com/login"


def test_whitespace_stripped():
    assert URLRequest(url="  https://example.com  ").url == "https://example.com"


@pytest.mark.parametrize(
    "bad",
    [
        "",
        "   ",
        "ftp://example.com/file",
        "javascript:alert(1)",
        "http://",
        "x" * 3000,
    ],
)
def test_invalid_urls_rejected(bad):
    with pytest.raises(ValidationError):
        URLRequest(url=bad)
