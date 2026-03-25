"""
NHIP Dashboard — Python server (Flask)
Serves the built React app (dist/) on any host/domain.

Usage:
  pip install -r requirements.txt
  npm run build          # build React first
  python server.py
"""

import os
from flask import Flask, send_from_directory, abort

app = Flask(__name__, static_folder='dist')

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    dist = app.static_folder
    target = os.path.join(dist, path)
    if path and os.path.exists(target) and os.path.isfile(target):
        return send_from_directory(dist, path)
    # SPA fallback — always return index.html
    return send_from_directory(dist, 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    print(f'🚀  NHIP Dashboard running at http://0.0.0.0:{port}')
    app.run(host='0.0.0.0', port=port, debug=debug)
