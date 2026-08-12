from datetime import datetime, date, time, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from pydantic import BaseModel

from ..database import get_db
from ..models import Asistencia, Usuario, Horario, Permiso

router = APIRouter(prefix="/api/reportes", tags=["Reportes"])


# ============ SCHEMAS ============

class ResumenUsuario(BaseModel):
    usuario_id: int
    nombre: str
    email: str
    area: str
    horario: str
    total_entradas: int
    total_salidas: int
    total_retardos: int
    total_faltas: int
    horas_trabajadas: float


class RetrasoDetalle(BaseModel):
    usuario_id: int
    nombre: str
    area: str
    fecha: str
    hora_programada: str
    hora_real: str
    retraso_min: int


class FaltaDetalle(BaseModel):
    usuario_id: int
    nombre: str
    email: str
    area: str
    fecha: str
    dia_semana: str


class ReporteArea(BaseModel):
    area: str
    total_usuarios: int
    promedio_asistencia: float
    total_retardos: int
    total_faltas: int
    usuarios: list[ResumenUsuario]


# ============ HELPERS ============

def time_to_str(t) -> str:
    if isinstance(t, time):
        return t.strftime("%H:%M")
    return str(t)


def calcular_retardos(usuario, asistencias_hoy, db):
    if not usuario.horarios:
        return 0
    h = usuario.horarios[0]
    retardos = 0
    for a in asistencias_hoy:
        if a.tipo == "entrada":
            hora_prog = h.hora_entrada if isinstance(h.hora_entrada, time) else time.fromisoformat(str(h.hora_entrada))
            hora_real = a.hora if isinstance(a.hora, time) else time.fromisoformat(str(a.hora))
            dt_prog = datetime.combine(a.fecha, hora_prog)
            dt_real = datetime.combine(a.fecha, hora_real)
            diff = (dt_real - dt_prog).total_seconds() / 60
            if diff > h.tolerancia_min:
                retardos += 1
    return retardos


# ============ REPORTE POR USUARIO ============

@router.get("/usuario/{usuario_id}", response_model=ResumenUsuario)
def reporte_usuario(
    usuario_id: int,
    periodo: str = Query("mes", enum=["semana", "mes", "anio"]),
    fecha_ref: str = Query(None),
    db: Session = Depends(get_db),
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    ref_date = date.fromisoformat(fecha_ref) if fecha_ref else date.today()
    query = db.query(Asistencia).filter(Asistencia.usuario_id == usuario_id)

    if periodo == "semana":
        start = ref_date - timedelta(days=ref_date.weekday())
        end = start + timedelta(days=6)
        query = query.filter(Asistencia.fecha >= start, Asistencia.fecha <= end)
    elif periodo == "mes":
        query = query.filter(
            extract("year", Asistencia.fecha) == ref_date.year,
            extract("month", Asistencia.fecha) == ref_date.month,
        )
    elif periodo == "anio":
        query = query.filter(extract("year", Asistencia.fecha) == ref_date.year)

    registros = query.all()
    entradas = sum(1 for r in registros if r.tipo == "entrada")
    salidas = sum(1 for r in registros if r.tipo == "salida")
    retardos = calcular_retardos(usuario, registros, db)

    horario_nombre = ""
    horas_trab = 0.0
    if usuario.horarios:
        h = usuario.horarios[0]
        horario_nombre = h.nombre
        hora_e = h.hora_entrada if isinstance(h.hora_entrada, time) else time.fromisoformat(str(h.hora_entrada))
        hora_s = h.hora_salida if isinstance(h.hora_salida, time) else time.fromisoformat(str(h.hora_salida))
        horas_trab = (datetime.combine(date.today(), hora_s) - datetime.combine(date.today(), hora_e)).total_seconds() / 3600

    dias_periodo = _dias_en_periodo(periodo, ref_date)
    faltas = max(0, dias_periodo - entradas)

    return ResumenUsuario(
        usuario_id=usuario.id,
        nombre=usuario.nombre,
        email=usuario.email,
        area=usuario.area or "",
        horario=horario_nombre,
        total_entradas=entradas,
        total_salidas=salidas,
        total_retardos=retardos,
        total_faltas=faltas,
        horas_trabajadas=round(horas_trab * entradas, 1),
    )


# ============ REPORTE POR AREA ============

@router.get("/area/{area}", response_model=ReporteArea)
def reporte_area(
    area: str,
    periodo: str = Query("mes", enum=["semana", "mes", "anio"]),
    fecha_ref: str = Query(None),
    db: Session = Depends(get_db),
):
    usuarios = db.query(Usuario).filter(Usuario.area == area, Usuario.activo == True).all()
    if not usuarios:
        return ReporteArea(area=area, total_usuarios=0, promedio_asistencia=0, total_retardos=0, total_faltas=0, usuarios=[])

    ref_date = date.fromisoformat(fecha_ref) if fecha_ref else date.today()
    total_retardos = 0
    total_faltas = 0
    total_asistencias = 0
    usuarios_reporte = []

    for u in usuarios:
        resumen = _resumen_usuario(u, periodo, ref_date, db)
        usuarios_reporte.append(resumen)
        total_retardos += resumen.total_retardos
        total_faltas += resumen.total_faltas
        total_asistencias += resumen.total_entradas

    dias = _dias_en_periodo(periodo, ref_date)
    promedio = round((total_asistencias / (len(usuarios) * dias)) * 100, 1) if dias > 0 and usuarios else 0

    return ReporteArea(
        area=area,
        total_usuarios=len(usuarios),
        promedio_asistencia=promedio,
        total_retardos=total_retardos,
        total_faltas=total_faltas,
        usuarios=usuarios_reporte,
    )


# ============ REPORTE DE RETARDOS ============

@router.get("/retardos", response_model=list[RetrasoDetalle])
def reporte_retardos(
    periodo: str = Query("mes", enum=["semana", "mes", "anio"]),
    fecha_ref: str = Query(None),
    db: Session = Depends(get_db),
):
    ref_date = date.fromisoformat(fecha_ref) if fecha_ref else date.today()
    usuarios = db.query(Usuario).filter(Usuario.activo == True, Usuario.rol != "admin").all()
    retardos = []

    for u in usuarios:
        if not u.horarios:
            continue
        h = u.horarios[0]
        hora_prog = h.hora_entrada if isinstance(h.hora_entrada, time) else time.fromisoformat(str(h.hora_entrada))
        tolerancia = h.tolerancia_min

        query = db.query(Asistencia).filter(
            Asistencia.usuario_id == u.id,
            Asistencia.tipo == "entrada",
        )

        if periodo == "semana":
            start = ref_date - timedelta(days=ref_date.weekday())
            end = start + timedelta(days=6)
            query = query.filter(Asistencia.fecha >= start, Asistencia.fecha <= end)
        elif periodo == "mes":
            query = query.filter(
                extract("year", Asistencia.fecha) == ref_date.year,
                extract("month", Asistencia.fecha) == ref_date.month,
            )
        elif periodo == "anio":
            query = query.filter(extract("year", Asistencia.fecha) == ref_date.year)

        for a in query.all():
            hora_real = a.hora if isinstance(a.hora, time) else time.fromisoformat(str(a.hora))
            diff = (datetime.combine(a.fecha, hora_real) - datetime.combine(a.fecha, hora_prog)).total_seconds() / 60
            if diff > tolerancia:
                retardos.append(RetrasoDetalle(
                    usuario_id=u.id,
                    nombre=u.nombre,
                    area=u.area or "",
                    fecha=str(a.fecha),
                    hora_programada=time_to_str(hora_prog),
                    hora_real=time_to_str(hora_real),
                    retraso_min=int(diff),
                ))

    retardos.sort(key=lambda x: x.retraso_min, reverse=True)
    return retardos


# ============ REPORTE DE FALTAS ============

@router.get("/faltas", response_model=list[FaltaDetalle])
def reporte_faltas(
    periodo: str = Query("mes", enum=["semana", "mes", "anio"]),
    fecha_ref: str = Query(None),
    db: Session = Depends(get_db),
):
    ref_date = date.fromisoformat(fecha_ref) if fecha_ref else date.today()
    usuarios = db.query(Usuario).filter(Usuario.activo == True, Usuario.rol != "admin").all()
    faltas = []
    dias_semana = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"]

    for u in usuarios:
        query = db.query(Asistencia).filter(
            Asistencia.usuario_id == u.id,
            Asistencia.tipo == "entrada",
        )

        if periodo == "semana":
            start = ref_date - timedelta(days=ref_date.weekday())
            end = start + timedelta(days=6)
            query = query.filter(Asistencia.fecha >= start, Asistencia.fecha <= end)
            dias_check = [start + timedelta(days=i) for i in range(7)]
        elif periodo == "mes":
            query = query.filter(
                extract("year", Asistencia.fecha) == ref_date.year,
                extract("month", Asistencia.fecha) == ref_date.month,
            )
            import calendar
            _, dias_mes = calendar.monthrange(ref_date.year, ref_date.month)
            dias_check = [date(ref_date.year, ref_date.month, d) for d in range(1, dias_mes + 1)]
        elif periodo == "anio":
            query = query.filter(extract("year", Asistencia.fecha) == ref_date.year)
            dias_check = []
            for m in range(1, 13):
                _, dm = calendar.monthrange(ref_date.year, m)
                dias_check.extend([date(ref_date.year, m, d) for d in range(1, dm + 1)])

        fechas_asistencia = {a.fecha for a in query.all()}

        for dia in dias_check:
            if dia.weekday() < 5 and dia <= ref_date and dia not in fechas_asistencia:
                faltas.append(FaltaDetalle(
                    usuario_id=u.id,
                    nombre=u.nombre,
                    email=u.email,
                    area=u.area or "",
                    fecha=str(dia),
                    dia_semana=dias_semana[dia.weekday()],
                ))

    faltas.sort(key=lambda x: x.fecha, reverse=True)
    return faltas


# ============ UTILS ============

def _dias_en_periodo(periodo: str, ref_date: date) -> int:
    if periodo == "semana":
        start = ref_date - timedelta(days=ref_date.weekday())
        return sum(1 for i in range(7) if start + timedelta(days=i) <= ref_date and (start + timedelta(days=i)).weekday() < 5)
    elif periodo == "mes":
        import calendar
        _, dias = calendar.monthrange(ref_date.year, ref_date.month)
        return sum(1 for d in range(1, min(dias, ref_date.day) + 1) if date(ref_date.year, ref_date.month, d).weekday() < 5)
    elif periodo == "anio":
        total = 0
        for m in range(1, ref_date.month):
            import calendar
            _, dm = calendar.monthrange(ref_date.year, m)
            total += sum(1 for d in range(1, dm + 1) if date(ref_date.year, m, d).weekday() < 5)
        import calendar
        _, dm = calendar.monthrange(ref_date.year, ref_date.month)
        total += sum(1 for d in range(1, min(dm, ref_date.day) + 1) if date(ref_date.year, ref_date.month, d).weekday() < 5)
        return total
    return 1


def _resumen_usuario(usuario, periodo, ref_date, db) -> ResumenUsuario:
    query = db.query(Asistencia).filter(Asistencia.usuario_id == usuario.id)

    if periodo == "semana":
        start = ref_date - timedelta(days=ref_date.weekday())
        end = start + timedelta(days=6)
        query = query.filter(Asistencia.fecha >= start, Asistencia.fecha <= end)
    elif periodo == "mes":
        query = query.filter(
            extract("year", Asistencia.fecha) == ref_date.year,
            extract("month", Asistencia.fecha) == ref_date.month,
        )
    elif periodo == "anio":
        query = query.filter(extract("year", Asistencia.fecha) == ref_date.year)

    registros = query.all()
    entradas = sum(1 for r in registros if r.tipo == "entrada")
    salidas = sum(1 for r in registros if r.tipo == "salida")
    retardos = calcular_retardos(usuario, registros, db)

    horario_nombre = ""
    horas_trab = 0.0
    if usuario.horarios:
        h = usuario.horarios[0]
        horario_nombre = h.nombre
        hora_e = h.hora_entrada if isinstance(h.hora_entrada, time) else time.fromisoformat(str(h.hora_entrada))
        hora_s = h.hora_salida if isinstance(h.hora_salida, time) else time.fromisoformat(str(h.hora_salida))
        horas_trab = (datetime.combine(date.today(), hora_s) - datetime.combine(date.today(), hora_e)).total_seconds() / 3600

    dias = _dias_en_periodo(periodo, ref_date)
    faltas = max(0, dias - entradas)

    return ResumenUsuario(
        usuario_id=usuario.id,
        nombre=usuario.nombre,
        email=usuario.email,
        area=usuario.area or "",
        horario=horario_nombre,
        total_entradas=entradas,
        total_salidas=salidas,
        total_retardos=retardos,
        total_faltas=faltas,
        horas_trabajadas=round(horas_trab * entradas, 1),
    )
