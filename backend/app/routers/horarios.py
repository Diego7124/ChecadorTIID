from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Horario
from ..schemas import HorarioCreate, HorarioUpdate, HorarioResponse, MessageResponse

router = APIRouter(prefix="/api/horarios", tags=["Horarios"])


@router.post("/", response_model=HorarioResponse)
def crear_horario(horario: HorarioCreate, db: Session = Depends(get_db)):
    db_horario = Horario(
        nombre=horario.nombre,
        hora_entrada=horario.hora_entrada,
        hora_salida=horario.hora_salida,
        tolerancia_min=horario.tolerancia_min,
    )
    db.add(db_horario)
    db.commit()
    db.refresh(db_horario)
    return db_horario


@router.get("/", response_model=list[HorarioResponse])
def listar_horarios(db: Session = Depends(get_db)):
    return db.query(Horario).filter(Horario.activo == True).all()


@router.get("/{horario_id}", response_model=HorarioResponse)
def obtener_horario(horario_id: int, db: Session = Depends(get_db)):
    horario = db.query(Horario).filter(Horario.id == horario_id).first()
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    return horario


@router.put("/{horario_id}", response_model=HorarioResponse)
def editar_horario(horario_id: int, datos: HorarioUpdate, db: Session = Depends(get_db)):
    horario = db.query(Horario).filter(Horario.id == horario_id).first()
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")

    update_data = datos.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(horario, key, value)

    db.commit()
    db.refresh(horario)
    return horario


@router.delete("/{horario_id}", response_model=MessageResponse)
def eliminar_horario(horario_id: int, db: Session = Depends(get_db)):
    horario = db.query(Horario).filter(Horario.id == horario_id).first()
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")

    horario.activo = False
    db.commit()
    return MessageResponse(message="Horario eliminado correctamente")
