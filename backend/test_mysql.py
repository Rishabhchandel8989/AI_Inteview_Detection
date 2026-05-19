import asyncio
import traceback
import sys
from database import init_db

async def run():
    try:
        print("Testing MySQL connection...")
        await init_db()
        print("Success! Database initialized.")
    except Exception as e:
        with open('trace.txt', 'w') as f:
            traceback.print_exc(file=f)

if __name__ == "__main__":
    asyncio.run(run())
