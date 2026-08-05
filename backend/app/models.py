from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, Time, DateTime,
    ForeignKey, Text, LargeBinary, Table
)
from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base

usuario_horario = Table(
    "usuario_horario",
    Base.metadata,
    Column("usuario_id", Integer, ForeignKey("usuarios.id"), primary_key=True),
    Column("horario_id", Integer, ForeignKey("horarios.id"), primary_key=True),
)


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    rol = Column(String, default="usuario")  # "admin" o "usuario"
    area = Column(String, default="")
    imagen_rostro = Column(String, default="")
    embedding = Column(LargeBinary, nullable=True)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    asistencias = relationship("Asistencia", back_populates="usuario")
    permisos = relationship("Permiso", back_populates="usuario")
    horarios = relationship("Horario", secondary=usuario_horario, back_populates="usuarios")


class Asistencia(Base):
    __tablename__ = "asistencia"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    tipo = Column(String, nullable=False)  # "entrada" o "salida"
    fecha = Column(Date, nullable=False)
    hora = Column(Time, nullable=False)
    imagen_capture = Column(String, default="")
    confianza = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    usuario = relationship("Usuario", back_populates="asistencias")


class Horario(Base):
    __tablename__ = "horarios"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String, nullable=False)
    hora_entrada = Column(Time, nullable=False)
    hora_salida = Column(Time, nullable=False)
    tolerancia_min = Column(Integer, default=15)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    usuarios = relationship("Usuario", secondary=usuario_horario, back_populates="horarios")


class Permiso(Base):
    __tablename__ = "permisos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    tipo = Column(String, nullable=False)  # "vacaciones", "permiso_medico", "personal"
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)
    motivo = Column(Text, default="")
    estado = Column(String, default="pendiente")  # "pendiente", "aprobado", "rechazado"
    created_at = Column(DateTime, default=datetime.utcnow)

    usuario = relationship("Usuario", back_populates="permisos")
