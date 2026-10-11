
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

database_url = os.getenv("DATABASE_URL")

if not database_url:
    raise RuntimeError("DATABASE_URL is missing. Check your .env file.")

engine = create_engine(database_url)

try:
    with engine.connect() as connection:
        database = connection.execute(
            text("SELECT current_database()")
        ).scalar_one()

        print("Database connection successful!")
        print(f"Connected database: {database}")

except Exception:
    print("Database connection failed.")
    print("Check your .env settings, PostgreSQL service, and password.")
    raise

finally:
    engine.dispose()
