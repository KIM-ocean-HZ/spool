#!/usr/bin/env python3
"""Local review server with byte-range seeking for Safari/WebKit video."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import re


class MediaHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def send_head(self):
        self.remaining = None
        path = Path(self.translate_path(self.path))
        header = self.headers.get("Range")
        if not header or not path.is_file():
            return super().send_head()
        match = re.fullmatch(r"bytes=(\d*)-(\d*)", header.strip())
        size = path.stat().st_size
        if not match or not size:
            self.send_error(416)
            return None
        start_text, end_text = match.groups()
        if not start_text:
            start, end = max(0, size - int(end_text or 0)), size - 1
        else:
            start = int(start_text)
            end = min(int(end_text) if end_text else size - 1, size - 1)
        if start > end or start >= size:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None
        file = path.open("rb")
        file.seek(start)
        self.remaining = end - start + 1
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(str(path)))
        self.send_header("Content-Length", str(self.remaining))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Last-Modified", self.date_time_string(path.stat().st_mtime))
        self.end_headers()
        return file

    def copyfile(self, source, outputfile):
        if self.remaining is None:
            return super().copyfile(source, outputfile)
        while self.remaining:
            chunk = source.read(min(65536, self.remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            self.remaining -= len(chunk)


parser = argparse.ArgumentParser()
parser.add_argument("--port", type=int, default=8754)
args = parser.parse_args()
directory = Path(__file__).resolve().parent.parent
server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(MediaHandler, directory=str(directory)))
print(f"Review: http://127.0.0.1:{args.port}/review.html", flush=True)
server.serve_forever()
