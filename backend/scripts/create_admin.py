"""
Safe first-admin creation.
Usage: python scripts/create_admin.py admin@example.com "Admin Name" "StrongPass123"
"""
import sys
from app.db.session import SessionLocal
from app.models.user import User, UserProfile
from app.core.security import hash_password

def main():
    if len(sys.argv) != 4:
        print("Usage: python scripts/create_admin.py <email> <full_name> <password>")
        sys.exit(1)
    email, name, password = sys.argv[1], sys.argv[2], sys.argv[3]
    db = SessionLocal()
    try:
        if db.query(User).filter_by(email=email).first():
            print("User already exists"); return
        u = User(email=email, full_name=name, password_hash=hash_password(password), role="admin")
        db.add(u); db.flush()
        db.add(UserProfile(user_id=u.id))
        db.commit()
        print(f"Admin created: {email}")
    finally:
        db.close()

if __name__ == "__main__":
    main()