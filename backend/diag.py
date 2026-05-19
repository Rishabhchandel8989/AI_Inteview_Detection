import subprocess
import sys

result = subprocess.run(
    [r"venv\Scripts\python.exe", "-c", """
import sys, traceback
try:
    import main
    print("Import OK")
except Exception as e:
    traceback.print_exc()
    print("CRITICAL ERROR:", e)
"""],
    capture_output=True,
    text=True,
    cwd=r"f:\AI_Inteview_Detection\backend"
)

with open(r"f:\AI_Inteview_Detection\backend\import_check.txt", "w") as f:
    f.write("STDOUT:\n")
    f.write(result.stdout)
    f.write("\nSTDERR:\n")
    f.write(result.stderr)
    f.write(f"\nReturn code: {result.returncode}")

print("Done!")
