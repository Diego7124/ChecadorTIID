from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, time, datetime


# ============ USUARIOS ============
class UsuarioBase(BaseModel):
    nombre: str
    email: str
    rol: str = "usuario"
    area: str = ""


class UsuarioCreate(UsuarioBase):
    password: str


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None
    rol: Optional[str] = None
    area: Optional[str] = None
    activo: Optional[bool] = None


class UsuarioResponse(UsuarioBase):
    id: int
    activo: bool
    imagen_rostro: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============ AUTH ============
class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    usuario: UsuarioResponse
    token: str


class LoginFacialRequest(BaseModel):
    imagen_base64: str


# ============ ASISTENCIA ============
class AsistenciaRequest(BaseModel):
    imagen_base64: str
    tipo: str = "entrada"  # "entrada" o "salida"


class AsistenciaResponse(BaseModel):
    id: int
    usuario_id: int
    nombre_usuario: str = ""
    tipo: str
    fecha: date
    hora: time
    confianza: float
    created_at: datetime

    class Config:
        from_attributes = True


# ============ HORARIOS ============
class HorarioBase(BaseModel):
    nombre: str
    hora_entrada: str  # "HH:MM"
    hora_salida: str   # "HH:MM"
    tolerancia_min: int = 15


class HorarioCreate(HorarioBase):
    pass


class HorarioUpdate(BaseModel):
    nombre: Optional[str] = None
    hora_entrada: Optional[str] = None
    hora_salida: Optional[str] = None
    tolerancia_min: Optional[int] = None
    activo: Optional[bool] = None


class HorarioResponse(HorarioBase):
    id: int
    activo: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============ PERMISOS ============
class PermisoBase(BaseModel):
    usuario_id: int
    tipo: str  # "vacaciones", "permiso_medico", "personal"
    fecha_inicio: date
    fecha_fin: date
    motivo: str = ""


class PermisoCreate(PermisoBase):
    pass


class PermisoUpdate(BaseModel):
    tipo: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    motivo: Optional[str] = None
    estado: Optional[str] = None


class PermisoResponse(PermisoBase):
    id: int
    estado: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============ GENERIC ============
class MessageResponse(BaseModel):
    message: str
    success: bool = True
