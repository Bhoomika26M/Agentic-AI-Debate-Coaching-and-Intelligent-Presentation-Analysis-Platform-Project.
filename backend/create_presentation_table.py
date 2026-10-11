
from sqlalchemy import inspect

import models
from database import Base, engine

table_name = "presentations"

inspector = inspect(engine)

if inspector.has_table(table_name):
    print("The presentations table already exists.")
else:
    models.Presentation.__table__.create(bind=engine)
    print("The presentations table was created successfully.")
