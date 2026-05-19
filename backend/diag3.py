import subprocess

result = subprocess.run(
    [r"venv\Scripts\python.exe", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
    capture_output=True,
    text=True,
    cwd=r"f:\AI_Inteview_Detection\backend",
    timeout=10
)

with open(r"f:\AI_Inteview_Detection\backend\uvicorn_full_log.txt", "w", encoding="utf-8") as f:
    f.write("=== STDOUT ===\n")
    f.write(result.stdout)
    f.write("\n=== STDERR ===\n")
    f.write(result.stderr)
    f.write(f"\n=== Return code: {result.returncode} ===\n")

print("Done! Check uvicorn_full_log.txt")
