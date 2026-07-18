import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4000
DIR = sys.argv[2] if len(sys.argv) > 2 else 'dist'

class SPAHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def do_GET(self):
        # Serve the requested file if it exists
        file_path = self.translate_path(self.path)
        if os.path.isfile(file_path):
            return super().do_GET()
        # Otherwise, serve index.html for SPA routing
        self.path = '/index.html'
        return super().do_GET()

if __name__ == '__main__':
    server = http.server.HTTPServer(('0.0.0.0', PORT), SPAHTTPRequestHandler)
    print(f'Serving SPA on port {PORT} from {os.path.abspath(DIR)}')
    server.serve_forever()