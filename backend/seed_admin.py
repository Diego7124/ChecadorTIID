"""Script para crear el usuario administrador inicial."""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import Usuario
from app.services.auth import hash_password

Base.metadata.create_all(bind=engine)


def crear_admin():
    db = SessionLocal()
    try:
        existing = db.query(Usuario).filter(Usuario.email == "admin@checador.com").first()
        if existing:
            print("Ya existe un usuario admin con ese email.")
            return

        admin = Usuario(
            nombre="Administrador",
            email="admin@checador.com",
            password_hash=hash_password("admin123"),
            rol="admin",
            area="Administración",
        )
        db.add(admin)
        db.commit()
        print("Admin creado: admin@checador.com / admin123")
    finally:
        db.close()


if __name__ == "__main__":
    crear_admin()
