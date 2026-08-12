from datetime import datetime, time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Horario
from ..schemas import HorarioCreate, HorarioUpdate, HorarioResponse, MessageResponse


def parse_time(t) -> time:
    if isinstance(t, time):
        return t
    h, m = t.strip().split(":")
    return time(int(h), int(m))


def horario_to_dict(h) -> dict:
    return {
        "id": h.id,
        "nombre": h.nombre,
        "hora_entrada": h.hora_entrada.strftime("%H:%M") if isinstance(h.hora_entrada, time) else h.hora_entrada,
        "hora_salida": h.hora_salida.strftime("%H:%M") if isinstance(h.hora_salida, time) else h.hora_salida,
        "tolerancia_min": h.tolerancia_min,
        "activo": h.activo,
        "created_at": h.created_at,
    }

router = APIRouter(prefix="/api/horarios", tags=["Horarios"])


@router.post("/", response_model=HorarioResponse)
def crear_horario(horario: HorarioCreate, db: Session = Depends(get_db)):
    db_horario = Horario(
        nombre=horario.nombre,
        hora_entrada=parse_time(horario.hora_entrada),
        hora_salida=parse_time(horario.hora_salida),
        tolerancia_min=horario.tolerancia_min,
    )
    db.add(db_horario)
    db.commit()
    db.refresh(db_horario)
    return horario_to_dict(db_horario)


@router.get("/", response_model=list[HorarioResponse])
def listar_horarios(db: Session = Depends(get_db)):
    horarios = db.query(Horario).filter(Horario.activo == True).all()
    return [horario_to_dict(h) for h in horarios]


@router.get("/{horario_id}", response_model=HorarioResponse)
def obtener_horario(horario_id: int, db: Session = Depends(get_db)):
    horario = db.query(Horario).filter(Horario.id == horario_id).first()
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    return horario_to_dict(horario)


@router.put("/{horario_id}", response_model=HorarioResponse)
def editar_horario(horario_id: int, datos: HorarioUpdate, db: Session = Depends(get_db)):
    horario = db.query(Horario).filter(Horario.id == horario_id).first()
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")

    update_data = datos.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key in ("hora_entrada", "hora_salida") and isinstance(value, str):
            value = parse_time(value)
        setattr(horario, key, value)

    db.commit()
    db.refresh(horario)
    return horario_to_dict(horario)


@router.delete("/{horario_id}", response_model=MessageResponse)
def eliminar_horario(horario_id: int, db: Session = Depends(get_db)):
    horario = db.query(Horario).filter(Horario.id == horario_id).first()
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")

    horario.activo = False
    db.commit()
    return MessageResponse(message="Horario eliminado correctamente")
