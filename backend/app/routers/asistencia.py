from datetime import datetime, date, time, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from ..database import get_db
from ..models import Asistencia, Usuario, Horario
from ..schemas import AsistenciaRequest, AsistenciaResponse, MessageResponse
from ..services.facial import verify_face_against_all

from pydantic import BaseModel

router = APIRouter(prefix="/api/asistencia", tags=["Asistencia"])


@router.post("/entrada", response_model=AsistenciaResponse)
def registrar_entrada(data: AsistenciaRequest, db: Session = Depends(get_db)):
    result = verify_face_against_all(data.imagen_base64, db)
    if not result:
        raise HTTPException(status_code=401, detail="Rostro no reconocido")

    usuario_id = result["usuario_id"]
    hoy = date.today()

    ya_registro = (
        db.query(Asistencia)
        .filter(Asistencia.usuario_id == usuario_id, Asistencia.fecha == hoy, Asistencia.tipo == "entrada")
        .first()
    )
    if ya_registro:
        raise HTTPException(status_code=400, detail="Ya registraste tu entrada hoy")

    now = datetime.now()
    asistencia = Asistencia(
        usuario_id=usuario_id,
        tipo="entrada",
        fecha=hoy,
        hora=now.time(),
        confianza=result["confianza"],
    )
    db.add(asistencia)
    db.commit()
    db.refresh(asistencia)

    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    return AsistenciaResponse(
        id=asistencia.id,
        usuario_id=asistencia.usuario_id,
        nombre_usuario=usuario.nombre if usuario else "",
        tipo=asistencia.tipo,
        fecha=asistencia.fecha,
        hora=asistencia.hora,
        confianza=asistencia.confianza,
        created_at=asistencia.created_at,
    )


@router.post("/salida", response_model=AsistenciaResponse)
def registrar_salida(data: AsistenciaRequest, db: Session = Depends(get_db)):
    result = verify_face_against_all(data.imagen_base64, db)
    if not result:
        raise HTTPException(status_code=401, detail="Rostro no reconocido")

    usuario_id = result["usuario_id"]
    hoy = date.today()

    ya_registro_salida = (
        db.query(Asistencia)
        .filter(Asistencia.usuario_id == usuario_id, Asistencia.fecha == hoy, Asistencia.tipo == "salida")
        .first()
    )
    if ya_registro_salida:
        raise HTTPException(status_code=400, detail="Ya registraste tu salida hoy")

    tiene_entrada = (
        db.query(Asistencia)
        .filter(Asistencia.usuario_id == usuario_id, Asistencia.fecha == hoy, Asistencia.tipo == "entrada")
        .first()
    )
    if not tiene_entrada:
        raise HTTPException(status_code=400, detail="Primero debes registrar tu entrada")

    now = datetime.now()
    asistencia = Asistencia(
        usuario_id=usuario_id,
        tipo="salida",
        fecha=hoy,
        hora=now.time(),
        confianza=result["confianza"],
    )
    db.add(asistencia)
    db.commit()
    db.refresh(asistencia)

    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    return AsistenciaResponse(
        id=asistencia.id,
        usuario_id=asistencia.usuario_id,
        nombre_usuario=usuario.nombre if usuario else "",
        tipo=asistencia.tipo,
        fecha=asistencia.fecha,
        hora=asistencia.hora,
        confianza=asistencia.confianza,
        created_at=asistencia.created_at,
    )


@router.get("/hoy", response_model=list[AsistenciaResponse])
def asistencia_hoy(db: Session = Depends(get_db)):
    hoy = date.today()
    registros = (
        db.query(Asistencia)
        .filter(Asistencia.fecha == hoy)
        .order_by(Asistencia.hora.desc())
        .all()
    )
    result = []
    for a in registros:
        usuario = db.query(Usuario).filter(Usuario.id == a.usuario_id).first()
        result.append(AsistenciaResponse(
            id=a.id,
            usuario_id=a.usuario_id,
            nombre_usuario=usuario.nombre if usuario else "",
            tipo=a.tipo,
            fecha=a.fecha,
            hora=a.hora,
            confianza=a.confianza,
            created_at=a.created_at,
        ))
    return result


@router.get("/usuario/{usuario_id}", response_model=list[AsistenciaResponse])
def historial_usuario(
    usuario_id: int,
    periodo: str = Query("mes", enum=["semana", "mes", "anio"]),
    fecha_ref: str = Query(None, description="Fecha de referencia YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    ref_date = date.fromisoformat(fecha_ref) if fecha_ref else date.today()
    query = db.query(Asistencia).filter(Asistencia.usuario_id == usuario_id)

    if periodo == "semana":
        start = ref_date - __import__("datetime").timedelta(days=ref_date.weekday())
        end = start + __import__("datetime").timedelta(days=6)
        query = query.filter(Asistencia.fecha >= start, Asistencia.fecha <= end)
    elif periodo == "mes":
        query = query.filter(
            extract("year", Asistencia.fecha) == ref_date.year,
            extract("month", Asistencia.fecha) == ref_date.month,
        )
    elif periodo == "anio":
        query = query.filter(extract("year", Asistencia.fecha) == ref_date.year)

    registros = query.order_by(Asistencia.fecha.desc(), Asistencia.hora.desc()).all()
    return [
        AsistenciaResponse(
            id=a.id,
            usuario_id=a.usuario_id,
            nombre_usuario=usuario.nombre,
            tipo=a.tipo,
            fecha=a.fecha,
            hora=a.hora,
            confianza=a.confianza,
            created_at=a.created_at,
        )
        for a in registros
    ]


@router.get("/area/{area}", response_model=list[AsistenciaResponse])
def historial_area(
    area: str,
    periodo: str = Query("mes", enum=["semana", "mes", "anio"]),
    fecha_ref: str = Query(None),
    db: Session = Depends(get_db),
):
    ref_date = date.fromisoformat(fecha_ref) if fecha_ref else date.today()
    usuario_ids = [
        u.id for u in db.query(Usuario).filter(Usuario.area == area, Usuario.activo == True).all()
    ]

    if not usuario_ids:
        return []

    query = db.query(Asistencia).filter(Asistencia.usuario_id.in_(usuario_ids))

    if periodo == "semana":
        start = ref_date - __import__("datetime").timedelta(days=ref_date.weekday())
        end = start + __import__("datetime").timedelta(days=6)
        query = query.filter(Asistencia.fecha >= start, Asistencia.fecha <= end)
    elif periodo == "mes":
        query = query.filter(
            extract("year", Asistencia.fecha) == ref_date.year,
            extract("month", Asistencia.fecha) == ref_date.month,
        )
    elif periodo == "anio":
        query = query.filter(extract("year", Asistencia.fecha) == ref_date.year)

    registros = query.order_by(Asistencia.fecha.desc(), Asistencia.hora.desc()).all()
    result = []
    for a in registros:
        usuario = db.query(Usuario).filter(Usuario.id == a.usuario_id).first()
        result.append(AsistenciaResponse(
            id=a.id,
            usuario_id=a.usuario_id,
            nombre_usuario=usuario.nombre if usuario else "",
            tipo=a.tipo,
            fecha=a.fecha,
            hora=a.hora,
            confianza=a.confianza,
            created_at=a.created_at,
        ))
    return result


# ============ ESTADO HOY ============

class EstadoHoyResponse(BaseModel):
    horario_nombre: str = ""
    hora_entrada: str = ""
    hora_salida: str = ""
    tolerancia_min: int = 0
    registro_entrada: str = ""
    registro_salida: str = ""
    retraso_min: int = 0
    tiene_retardo: bool = False


@router.get("/estado-hoy/{usuario_id}", response_model=EstadoHoyResponse)
def estado_hoy(usuario_id: int, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    hoy = date.today()
    resp = EstadoHoyResponse()

    if usuario.horarios:
        h = usuario.horarios[0]
        resp.horario_nombre = h.nombre
        resp.hora_entrada = h.hora_entrada.strftime("%H:%M") if isinstance(h.hora_entrada, time) else str(h.hora_entrada)
        resp.hora_salida = h.hora_salida.strftime("%H:%M") if isinstance(h.hora_salida, time) else str(h.hora_salida)
        resp.tolerancia_min = h.tolerancia_min

    entrada = (
        db.query(Asistencia)
        .filter(Asistencia.usuario_id == usuario_id, Asistencia.fecha == hoy, Asistencia.tipo == "entrada")
        .first()
    )
    if entrada:
        resp.registro_entrada = entrada.hora.strftime("%H:%M") if isinstance(entrada.hora, time) else str(entrada.hora)

        if usuario.horarios:
            h = usuario.horarios[0]
            hora_prog = h.hora_entrada if isinstance(h.hora_entrada, time) else time.fromisoformat(str(h.hora_entrada))
            hora_real = entrada.hora if isinstance(entrada.hora, time) else time.fromisoformat(str(entrada.hora))

            dt_prog = datetime.combine(hoy, hora_prog)
            dt_real = datetime.combine(hoy, hora_real)
            diff = (dt_real - dt_prog).total_seconds() / 60

            if diff > h.tolerancia_min:
                resp.tiene_retardo = True
                resp.retraso_min = int(diff)

    salida = (
        db.query(Asistencia)
        .filter(Asistencia.usuario_id == usuario_id, Asistencia.fecha == hoy, Asistencia.tipo == "salida")
        .first()
    )
    if salida:
        resp.registro_salida = salida.hora.strftime("%H:%M") if isinstance(salida.hora, time) else str(salida.hora)

    return resp
