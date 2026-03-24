import urllib.request
import urllib.parse
import urllib.error

# 1. Create a session
req = urllib.request.Request("http://127.0.0.1:8000/sessions", data=b'{"candidate_name": "Test"}', headers={'Content-type': 'application/json'})
try:
    with urllib.request.urlopen(req) as response:
        import json
        session_id = json.loads(response.read())["id"]
except urllib.error.URLError as e:
    print(f"Session Error: {e.read().decode('utf-8')}")
    exit(1)

# 2. Analyze
b64_img = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP"
data = urllib.parse.urlencode({'frame': b64_img}).encode('ascii')
req2 = urllib.request.Request(f"http://127.0.0.1:8000/sessions/{session_id}/analyze", data=data)

try:
    with urllib.request.urlopen(req2) as response:
        print(response.read())
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code)
    print(e.read().decode('utf-8'))
