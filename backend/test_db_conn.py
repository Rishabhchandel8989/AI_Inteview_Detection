import asyncio
import aiomysql
import os

async def test_conn():
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASS = os.getenv("DB_PASS", "Rishabh@6062")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    
    print(f"Connecting to {DB_HOST}:{DB_PORT} as {DB_USER}...")
    try:
        conn = await aiomysql.connect(host=DB_HOST, port=int(DB_PORT), user=DB_USER, password=DB_PASS)
        print("Successfully connected to MySQL!")
        conn.close()
    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    asyncio.run(test_conn())
