import os
from pathlib import Path
from tempfile import gettempdir
from uuid import uuid4

import pytest

TEST_DATABASE_PATH = Path(gettempdir()) / f"debate-coach-tests-{uuid4().hex}.db"
TEST_DATABASE = f"sqlite:///{TEST_DATABASE_PATH.as_posix()}"
os.environ["DATABASE_URL"] = TEST_DATABASE
os.environ["GEMINI_API_KEY"] = "PASTE_YOUR_GEMINI_API_KEY_HERE"

from app.core import config as config_module

config_module.get_settings.cache_clear()


@pytest.fixture(scope="session", autouse=True)
def remove_isolated_test_database():
    yield
    from app.core.database import engine

    engine.dispose()
    if TEST_DATABASE_PATH.exists():
        TEST_DATABASE_PATH.unlink()
