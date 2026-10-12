"""Keep credentials out of messages that reach logs, job rows or the browser.

Some services take their key in the query string (SABnzbd ``apikey``, Kavita
``apiKey``) and HTTP client errors quote the whole URL, so an ordinary
"403 Forbidden" would otherwise carry the key into the Activity page, the log
and any screenshot of either.
"""

from __future__ import annotations

import re

_SECRET_NAMES = (
    r"api[_-]?key|apikey|key|token|access[_-]?token|password|passwd|pass|secret|auth"
)
_QUERY_SECRET = re.compile(rf"(?i)((?:[?&;])(?:{_SECRET_NAMES})=)[^&#;\s'\"<>]+")
# In an encoded URL, encoded separators end the value; in an ordinary URL
# they belong to the credential itself and must also be masked.
_ENCODED_QUERY_SECRET = re.compile(
    rf"(?i)((?:%3F|%26|%3B)(?:{_SECRET_NAMES})%3D)"
    r"(?:(?!%26|%3B|%23)[^&#;\s'\"<>])+"
)
_URL_USERINFO = re.compile(r"(?i)(\b[a-z][a-z0-9+.-]*://[^/\s:@]+:)[^@\s/]+@")
REDACTED = "[redacted]"


def redact_secrets(text: str) -> str:
    """Mask query-string credentials and ``user:password@`` in any URL."""

    text = _QUERY_SECRET.sub(rf"\1{REDACTED}", text)
    text = _ENCODED_QUERY_SECRET.sub(rf"\1{REDACTED}", text)
    return _URL_USERINFO.sub(rf"\1{REDACTED}@", text)
