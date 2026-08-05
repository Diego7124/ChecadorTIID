from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
import json

from ..database import get_db
from ..models import Usuario
from ..schemas import (
    UsuarioCreate, UsuarioUpdate, UsuarioResponse,
    LoginRequest, LoginResponse, LoginFacialRequest, MessageResponse
)
from ..services.auth import hash_password, verify_password, create_access_token
from ..services.facial import register_face, register_face_single, verify_face_against_all

router = APIRouter(prefix="/api/usuarios", tags=["Usuarios"])


@router.post("/registro", response_model=UsuarioResponse)
def crear_usuario(
    nombre: str = Body(...),
    email: str = Body(...),
    password: str = Body(...),
    rol: str = Body("usuario"),
    area: str = Body(""),
    imagen_base64: str = Body(""),
    imagenes_base64: str = Body(""),
    db: Session = Depends(get_db),
):
    existing = db.query(Usuario).filter(Usuario.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    db_usuario = Usuario(
        nombre=nombre,
        email=email,
        password_hash=hash_password(password),
        rol=rol,
        area=area,
    )
    db.add(db_usuario)
    db.commit()
    db.refresh(db_usuario)

    if imagenes_base64:
        try:
            images_list = json.loads(imagenes_base64)
            if len(images_list) > 0:
                img_paths, embedding = register_face(db_usuario.id, images_list)
                db_usuario.imagen_rostro = img_paths[0]
                db_usuario.embedding = embedding.tobytes()
                db.commit()
                db.refresh(db_usuario)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error al procesar rostro: {str(e)}")
    elif imagen_base64:
        try:
            img_path, embedding = register_face_single(db_usuario.id, imagen_base64)
            db_usuario.imagen_rostro = img_path
            db_usuario.embedding = embedding.tobytes()
            db.commit()
            db.refresh(db_usuario)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error al procesar rostro: {str(e)}")

    return db_usuario


@router.get("/", response_model=list[UsuarioResponse])
def listar_usuarios(db: Session = Depends(get_db)):
    return db.query(Usuario).filter(Usuario.activo == True).all()


@router.get("/{usuario_id}", response_model=UsuarioResponse)
def obtener_usuario(usuario_id: int, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario


@router.put("/{usuario_id}", response_model=UsuarioResponse)
def editar_usuario(usuario_id: int, datos: UsuarioUpdate, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    update_data = datos.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(usuario, key, value)

    db.commit()
    db.refresh(usuario)
    return usuario


@router.delete("/{usuario_id}", response_model=MessageResponse)
def eliminar_usuario(usuario_id: int, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    usuario.activo = False
    db.commit()
    return MessageResponse(message="Usuario eliminado correctamente")


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == data.email).first()
    if not usuario or not verify_password(data.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    if not usuario.activo:
        raise HTTPException(status_code=403, detail="Usuario desactivado")

    token = create_access_token({"sub": str(usuario.id), "rol": usuario.rol})
    return LoginResponse(usuario=UsuarioResponse.model_validate(usuario), token=token)


@router.post("/login-facial", response_model=LoginResponse)
def login_facial(data: LoginFacialRequest, db: Session = Depends(get_db)):
    result = verify_face_against_all(data.imagen_base64, db)
    if not result:
        raise HTTPException(status_code=401, detail="Rostro no reconocido")

    usuario = db.query(Usuario).filter(Usuario.id == result["usuario_id"]).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    token = create_access_token({"sub": str(usuario.id), "rol": usuario.rol})
    return LoginResponse(usuario=UsuarioResponse.model_validate(usuario), token=token)
