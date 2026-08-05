from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract

from ..database import get_db
from ..models import Permiso, Usuario
from ..schemas import PermisoCreate, PermisoUpdate, PermisoResponse, MessageResponse

router = APIRouter(prefix="/api/permisos", tags=["Permisos"])


@router.post("/", response_model=PermisoResponse)
def crear_permiso(permiso: PermisoCreate, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == permiso.usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    db_permiso = Permiso(
        usuario_id=permiso.usuario_id,
        tipo=permiso.tipo,
        fecha_inicio=permiso.fecha_inicio,
        fecha_fin=permiso.fecha_fin,
        motivo=permiso.motivo,
    )
    db.add(db_permiso)
    db.commit()
    db.refresh(db_permiso)
    return db_permiso


@router.get("/", response_model=list[PermisoResponse])
def listar_permisos(
    periodo: str = Query("mes", enum=["semana", "mes", "anio"]),
    fecha_ref: str = Query(None),
    db: Session = Depends(get_db),
):
    from datetime import date, timedelta

    ref_date = date.fromisoformat(fecha_ref) if fecha_ref else date.today()
    query = db.query(Permiso)

    if periodo == "semana":
        start = ref_date - timedelta(days=ref_date.weekday())
        end = start + timedelta(days=6)
        query = query.filter(Permiso.fecha_inicio >= start, Permiso.fecha_inicio <= end)
    elif periodo == "mes":
        query = query.filter(
            extract("year", Permiso.fecha_inicio) == ref_date.year,
            extract("month", Permiso.fecha_inicio) == ref_date.month,
        )
    elif periodo == "anio":
        query = query.filter(extract("year", Permiso.fecha_inicio) == ref_date.year)

    return query.order_by(Permiso.created_at.desc()).all()


@router.get("/usuario/{usuario_id}", response_model=list[PermisoResponse])
def historial_permisos_usuario(
    usuario_id: int,
    periodo: str = Query("mes", enum=["semana", "mes", "anio"]),
    fecha_ref: str = Query(None),
    db: Session = Depends(get_db),
):
    from datetime import date, timedelta

    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    ref_date = date.fromisoformat(fecha_ref) if fecha_ref else date.today()
    query = db.query(Permiso).filter(Permiso.usuario_id == usuario_id)

    if periodo == "semana":
        start = ref_date - timedelta(days=ref_date.weekday())
        end = start + timedelta(days=6)
        query = query.filter(Permiso.fecha_inicio >= start, Permiso.fecha_inicio <= end)
    elif periodo == "mes":
        query = query.filter(
            extract("year", Permiso.fecha_inicio) == ref_date.year,
            extract("month", Permiso.fecha_inicio) == ref_date.month,
        )
    elif periodo == "anio":
        query = query.filter(extract("year", Permiso.fecha_inicio) == ref_date.year)

    return query.order_by(Permiso.created_at.desc()).all()


@router.put("/{permiso_id}", response_model=PermisoResponse)
def editar_permiso(permiso_id: int, datos: PermisoUpdate, db: Session = Depends(get_db)):
    permiso = db.query(Permiso).filter(Permiso.id == permiso_id).first()
    if not permiso:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")

    update_data = datos.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(permiso, key, value)

    db.commit()
    db.refresh(permiso)
    return permiso


@router.delete("/{permiso_id}", response_model=MessageResponse)
def eliminar_permiso(permiso_id: int, db: Session = Depends(get_db)):
    permiso = db.query(Permiso).filter(Permiso.id == permiso_id).first()
    if not permiso:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")

    db.delete(permiso)
    db.commit()
    return MessageResponse(message="Permiso eliminado correctamente")
