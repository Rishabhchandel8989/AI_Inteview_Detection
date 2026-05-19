import subprocess

result = subprocess.run(
    [r"venv\Scripts\python.exe", "-c", """
import asyncio
import sys
import traceback

async def test():
    try:
        from database import init_db
        print("Calling init_db()...")
        await init_db()
        print("init_db() SUCCESS")
    except Exception as e:
        print("INIT_DB ERROR:", e)
        traceback.print_exc()

asyncio.run(test())
"""],
    capture_output=True,
    text=True,
    cwd=r"f:\AI_Inteview_Detection\backend"
)

with open(r"f:\AI_Inteview_Detection\backend\startup_check.txt", "w") as f:
    f.write("STDOUT:\n")
    f.write(result.stdout)
    f.write("\nSTDERR:\n")
    f.write(result.stderr)
    f.write(f"\nReturn code: {result.returncode}")

print("Done! Check startup_check.txt")
