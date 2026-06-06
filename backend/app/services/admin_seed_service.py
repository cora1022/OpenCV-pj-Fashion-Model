from sqlalchemy.orm import Session

from backend.app.models.admin_user import AdminUser


def seed_admin_users(db: Session, admin_users_value: str) -> int:
    entries = _parse_admin_users(admin_users_value)
    changed = 0

    for entry in entries:
        admin = (
            db.query(AdminUser)
            .filter(AdminUser.username == entry["username"])
            .one_or_none()
        )

        if admin is None:
            admin = AdminUser(
                username=entry["username"],
                display_name=entry["display_name"],
                password_hash=entry["password_hash"],
            )
            db.add(admin)
            changed += 1
        else:
            admin.display_name = entry["display_name"]
            admin.password_hash = entry["password_hash"]
            changed += 1

    if changed:
        db.commit()

    return changed


def _parse_admin_users(value: str) -> list[dict[str, str]]:
    if not value:
        return []

    entries = []
    for raw_entry in value.split(","):
        parts = [part.strip() for part in raw_entry.split(":", 2)]
        if len(parts) != 3 or not all(parts):
            continue
        entries.append(
            {
                "username": parts[0],
                "display_name": parts[1],
                "password_hash": parts[2],
            }
        )

    return entries
