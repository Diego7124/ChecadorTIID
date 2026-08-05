from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import engine, Base
from .routers import usuarios, asistencia, horarios, vacaciones

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ChecadorTIID API",
    description="API de control de asistencia con reconocimiento facial",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(usuarios.router)
app.include_router(asistencia.router)
app.include_router(horarios.router)
app.include_router(vacaciones.router)


@app.get("/")
def root():
    return {"message": "ChecadorTIID API - Reconocimiento Facial"}


@app.get("/api/health")
def health():
    return {"status": "ok"}
