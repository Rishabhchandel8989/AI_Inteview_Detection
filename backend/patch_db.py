import re
import urllib.parse

with open('database.py', 'r') as f:
    orig = f.read()

# Make sure we import urllib.parse
if "import urllib.parse" not in orig:
    orig = "import urllib.parse\n" + orig

# Find the DATABASE_URL line and replace it with encoded logic
pattern = r'DATABASE_URL\s*=\s*f"mysql\+aiomysql://\{DB_USER\}:\{DB_PASS\}@\{DB_HOST\}:\{DB_PORT\}/\{DB_NAME\}"'
replacement = 'encoded_pass = urllib.parse.quote_plus(DB_PASS)\nDATABASE_URL = f"mysql+aiomysql://{DB_USER}:{encoded_pass}@{DB_HOST}:{DB_PORT}/{DB_NAME}"'

new_content = re.sub(pattern, replacement, orig)

with open('database.py', 'w') as f:
    f.write(new_content)

print("Patch applied." if new_content != orig else "Patch already applied or pattern not found.")
