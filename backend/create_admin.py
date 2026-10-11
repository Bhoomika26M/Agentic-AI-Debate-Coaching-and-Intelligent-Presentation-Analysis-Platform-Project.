
from getpass import getpass

from sqlalchemy import select

import models
from database import SessionLocal
from security import hash_password


def create_admin():
    name = "admin"
    email = "admin@gmail.com"

    password = getpass("Create Administrator password: ")
    confirm_password = getpass("Confirm Administrator password: ")

    if len(password) < 8:
        print("Password must contain at least 8 characters.")
        return

    if len(password) > 72:
        print("Password must not exceed 72 characters.")
        return

    if password != confirm_password:
        print("Passwords do not match.")
        return

    db = SessionLocal()

    try:
        existing_user = db.scalar(
            select(models.User).where(models.User.email == email)
        )

        if existing_user:
            print("An account with this email already exists.")
            print("No changes were made.")
            return

        admin = models.User(
            name=name,
            email=email,
            password=hash_password(password),
            role="Administrator",
        )

        db.add(admin)
        db.commit()

        print("Administrator account created successfully!")
        print("Email:", email)
        print("Role: Administrator")

    except Exception:
        db.rollback()
        print("Could not create the account. Check the backend configuration.")

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
