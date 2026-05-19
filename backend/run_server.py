import uvicorn
import traceback

if __name__ == "__main__":
    try:
        uvicorn.run("main:app", host="0.0.0.0", port=8000)
    except Exception as e:
        traceback.print_exc()
        input("Press Enter to exit...")
