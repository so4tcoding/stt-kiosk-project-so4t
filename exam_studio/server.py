"""기말 문제 스튜디오 서버. 키오스크 음성 모델은 불러오지 않는다."""

from __future__ import annotations

import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import generator  # noqa: E402

STATIC = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/styles.css": ("styles.css", "text/css; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
}
STATIC_ROOT = (ROOT / "static").resolve()


class ExamHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/catalog":
            return self._send(200, generator.catalog())
        if path == "/api/style":
            return self._send(200, generator.style_payload())
        if path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return
        if path in STATIC:
            return self._file(*STATIC[path])
        self._send(404, {"error": "없는 주소입니다."})

    def do_POST(self):
        path = urlparse(self.path).path
        length = int(self.headers.get("Content-Length") or 0)
        if length > 100_000:
            return self._send(413, {"error": "내용이 너무 깁니다."})
        raw = self.rfile.read(length).decode("utf-8") if length else "{}"
        try:
            body = json.loads(raw or "{}")
        except json.JSONDecodeError:
            return self._send(400, {"error": "요청 형식을 읽지 못했습니다."})
        if not isinstance(body, dict):
            return self._send(400, {"error": "요청 형식을 읽지 못했습니다."})
        try:
            if path == "/api/generate":
                paper = generator.generate(
                    mode=body.get("mode"),
                    subject=body.get("subject"),
                    units=body.get("units") or None,
                    count=body.get("count", 8),
                    seed=body.get("seed", 1),
                )
                return self._send(200, paper)
            if path == "/api/learn":
                return self._send(200, generator.learn(body.get("kind"), body.get("text") or ""))
            if path == "/api/style/reset":
                return self._send(200, generator.reset_custom())
        except ValueError as exc:
            return self._send(400, {"error": str(exc)})
        self._send(404, {"error": "없는 주소입니다."})

    def _file(self, name: str, content_type: str):
        path = (STATIC_ROOT / name).resolve()
        if STATIC_ROOT not in path.parents and path != STATIC_ROOT:
            return self._send(404, {"error": "없는 주소입니다."})
        if not path.is_file():
            return self._send(404, {"error": "없는 주소입니다."})
        data = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _send(self, status: int, payload: dict):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt: str, *args):
        message = fmt % args
        if "/api/learn" in message:
            print("[exam] learn request")
            return
        print(f"[exam] {message}")


def main():
    port = 8765
    server = ThreadingHTTPServer(("0.0.0.0", port), ExamHandler)
    print(f"[exam] studio http://127.0.0.1:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
