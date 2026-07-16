import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class Handler(BaseHTTPRequestHandler):
    calls = 0

    def do_GET(self):
        if self.path == "/calls":
            body = json.dumps({"calls": self.calls}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_error(404)

    def do_POST(self):
        if self.path != "/v1/chat/completions":
            self.send_error(404)
            return
        self.__class__.calls += 1
        length = int(self.headers.get("Content-Length", 0))
        request = json.loads(self.rfile.read(length) or b"{}")
        is_test = request.get("max_tokens") == 12
        content = {"ok": True} if is_test else {
            "rating": "neutral",
            "position_range": {"min": 20, "max": 35},
            "summary": "结构化数据表明趋势与流动性相对均衡，仍需观察宏观变化。",
            "opportunities": ["趋势指标保持稳定", "流动性评分提供支撑"],
            "risks": ["估值变化可能带来波动", "宏观数据存在滞后性"],
            "watchlist": [{"name": "PMI", "value": "50", "reason": "观察增长动能"}],
            "disclaimer": "provider text",
        }
        body = json.dumps({
            "choices": [{"message": {"content": json.dumps(content, ensure_ascii=False)}}],
        }, ensure_ascii=False).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8123), Handler).serve_forever()
