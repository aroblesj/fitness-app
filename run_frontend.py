import http.server
import socketserver
import os

PORT = 8080
DIRECTORY = "UI"

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Serve from the specified directory
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Send headers to prevent browser caching of HTML, CSS, and JS files
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

if __name__ == "__main__":
    # Change to root dir to find UI subdirectory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Allow port reuse to prevent "Address already in use" errors on restart
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
        print(f"Serving {DIRECTORY} on port {PORT} with no-cache headers...")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
