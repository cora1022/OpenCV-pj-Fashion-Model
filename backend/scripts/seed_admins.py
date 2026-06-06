from backend.app.core.config import settings
from backend.app.db.base import Base
from backend.app.db.session import SessionLocal, engine
from backend.app.models import AdminUser, SavedFashion
from backend.app.services.admin_seed_service import seed_admin_users


def main():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        changed = seed_admin_users(db, settings.admin_users)
    print(f"Seeded or updated {changed} admin user(s).")


if __name__ == "__main__":
    main()
