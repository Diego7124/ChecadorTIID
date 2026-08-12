"""Script para borrar todos los usuarios excepto el admin."""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import Usuario, Asistencia, Permiso, Horario, usuario_horario

Base.metadata.create_all(bind=engine)


def limpiar():
    db = SessionLocal()
    try:
        admin = db.query(Usuario).filter(Usuario.email == "admin@checador.com").first()
        if not admin:
            print("No se encontro el admin. Crea el admin primero con seed_admin.py")
            return

        admin_id = admin.id

        asistencias = db.query(Asistencia).filter(Asistencia.usuario_id != admin_id).delete(synchronize_session=False)
        permisos = db.query(Permiso).filter(Permiso.usuario_id != admin_id).delete(synchronize_session=False)
        db.execute(usuario_horario.delete().where(usuario_horario.c.usuario_id != admin_id))
        usuarios = db.query(Usuario).filter(Usuario.id != admin_id).delete(synchronize_session=False)

        db.commit()
        print(f"Eliminados: {usuarios} usuarios, {asistencias} asistencias, {permisos} permisos")
        print(f"Admin conserve: {admin.nombre} ({admin.email})")
    finally:
        db.close()


if __name__ == "__main__":
    limpiar()
