# ChecadorTIID - Sistema de Asistencia con Reconocimiento Facial

Aplicación móvil completa (Frontend + Backend) para el control de asistencia, cuyo mecanismo principal de autenticación sea el reconocimiento facial mediante inteligencia artificial.

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Backend | FastAPI + Python |
| Base de Datos | SQLite + SQLAlchemy ORM |
| IA / Biometría | DeepFace (ArcFace) + RetinaFace (detector) |
| Frontend Móvil | React Native (Expo SDK 54) + Expo Router |
| Cámara | expo-camera |
| Estado Global | Zustand |
| HTTP Client | Axios |
| Estilos | StyleSheet (React Native) |

## Reconocimiento Facial

- **Modelo de embedding:** ArcFace (deepface)
- **Detector de rostros:** RetinaFace
- **Métrica de similitud:** Coseno (cosine similarity)
- **Umbral de aceptación:** 0.45 (45%)
- **Imágenes por registro:** 5 fotografías promediadas en un solo vector
- **Normalización:** L2-norm del vector promedio

## Funcionalidades

### Login
- Login con credenciales (email + contraseña)
- Login facial con cámara frontal, guía oval y countdown de 3 segundos
- Redirección automática según rol (admin → `/admin`, usuario → `/usuario`)
- Diseño moderno con fondo oscuro, cards glassmorphism y decoraciones

### Módulo Admin
- **Gestión de Usuarios:** Lista, eliminar con confirmación
- **Registro de Usuarios:** Formulario + captura de 5 fotos faciales con guía oval
- **Control de Asistencia:** Botones Entrada/Salida con cámara, lista del día con confianza %
- **Gestión de Horarios:** CRUD con toggle AM/PM, conversión automática a formato 24h
- **Asignación de Horarios:** Asignar/remover horarios a usuarios con modal de selección
- **Permisos:** Lista con filtros (Semana/Mes/Año), Aprobar/Rechazar pendientes
- **Reportes:** 3 tipos de reportes con selector de periodo:
  - **Por Usuario:** Entradas, salidas, retardos, faltas, horas trabajadas
  - **Retardos:** Lista cronológica con detalle de retraso
  - **Faltas:** Días sin registro de entrada

### Módulo Usuario
- **Checar:** Botones Entrada/Salida con validación (no repetir en el mismo día), muestra horario asignado y estado de retardo
- **Historial:** Resumen de entradas/salidas con filtros de período
- **Permisos:** Crear permisos (Personal/Vacaciones/Médico) con date pickers

### General
- **Auto-refresh:** Todas las pantallas se refrescan al navegar (`useFocusEffect`)
- **Loading indicators:** Spinners en carga de datos y botones de acción
- **Validación de asistencia:** No se puede registrar 2 entradas o 2 salidas en el mismo día, la salida requiere entrada previa

## Estructura del Proyecto

```
ChecadorTIID/
├── backend/
│   ├── .env                              # Variables de entorno
│   ├── checador.db                       # Base de datos SQLite
│   ├── requirements.txt                  # Dependencias Python
│   ├── seed_admin.py                     # Script para crear admin inicial
│   ├── limpiar_usuarios.py              # Script para borrar usuarios (conserva admin)
│   ├── venv/                             # Entorno virtual
│   └── app/
│       ├── main.py                       # Entrada FastAPI
│       ├── database.py                   # Configuración SQLAlchemy
│       ├── models.py                     # Modelos ORM
│       ├── schemas.py                    # Schemas Pydantic
│       ├── uploads/                      # Imágenes faciales almacenadas
│       ├── routers/
│       │   ├── usuarios.py               # Endpoints de usuarios, auth y asignación de horarios
│       │   ├── asistencia.py             # Endpoints de asistencia y estado del día
│       │   ├── horarios.py               # Endpoints de horarios
│       │   ├── vacaciones.py             # Endpoints de permisos
│       │   └── reportes.py              # Endpoints de reportes
│       └── services/
│           ├── auth.py                   # Hash bcrypt + JWT
│           └── facial.py                 # Registro y verificación facial
└── my-expo-app/
    ├── app.json                          # Configuración Expo
    ├── package.json                      # Dependencias npm
    ├── tsconfig.json                     # Configuración TypeScript
    ├── types/
    │   └── index.ts                      # Interfaces TypeScript
    ├── store/
    │   └── authStore.ts                  # Estado global (Zustand)
    ├── services/
    │   └── api.ts                        # Cliente HTTP (Axios)
    └── app/
        ├── _layout.tsx                   # Layout raíz (Stack)
        ├── index.tsx                     # Pantalla de login
        ├── admin/
        │   ├── _layout.tsx               # Layout admin (Tabs)
        │   ├── usuarios.tsx              # Lista de usuarios
        │   ├── registrar-usuario.tsx     # Registro con captura facial
        │   ├── asistencia.tsx            # Toma de asistencia
        │   ├── horarios.tsx              # Gestión de horarios (AM/PM)
        │   ├── asignar-horario.tsx       # Asignar horarios a usuarios
        │   ├── vacaciones.tsx            # Historial de permisos
        │   ├── reportes.tsx             # Reportes (usuario/retardos/faltas)
        │   ├── historial-usuario.tsx     # Historial por usuario
        │   └── historial-area.tsx        # Historial por área
        └── usuario/
            ├── _layout.tsx               # Layout usuario (Tabs)
            ├── checar.tsx                # Checar entrada/salida con horario asignado
            ├── historial.tsx             # Mi historial
            └── permisos.tsx              # Crear/editar permisos
```

## Base de Datos

### Diagrama de Relaciones

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│   usuarios   │──1:N──│   asistencia     │       │   horarios   │
│              │       └──────────────────┘       │              │
│              │──1:N──┌──────────────────┐       │              │
│              │       │    permisos      │       │              │
│              │──M:N──│  usuario_horario  │──N:M──│              │
└──────────────┘       └──────────────────┘       └──────────────┘
```

### Tabla: usuarios

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PK | ID único (autoincrement) |
| nombre | TEXT NOT NULL | Nombre completo |
| email | TEXT UNIQUE NOT NULL | Correo electrónico |
| password_hash | TEXT NOT NULL | Hash bcrypt de contraseña |
| rol | TEXT | "admin" o "usuario" (default: "usuario") |
| area | TEXT | Departamento (default: "") |
| imagen_rostro | TEXT | Ruta de imagen facial principal |
| embedding | BLOB | Vector facial (ArcFace embedding) |
| activo | BOOLEAN | Habilitado/deshabilitado (default: true) |
| created_at | DATETIME | Fecha de creación |
| updated_at | DATETIME | Última actualización |

### Tabla: asistencia

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PK | ID único (autoincrement) |
| usuario_id | INTEGER FK | Referencia a usuarios.id |
| tipo | TEXT NOT NULL | "entrada" o "salida" |
| fecha | DATE NOT NULL | Fecha del registro |
| hora | TIME NOT NULL | Hora del registro |
| imagen_capture | TEXT | Ruta de imagen capturada |
| confianza | REAL | % de confianza del match |
| created_at | DATETIME | Fecha de creación |

### Tabla: horarios

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PK | ID único (autoincrement) |
| nombre | TEXT NOT NULL | Nombre del turno (ej: "Matutino") |
| hora_entrada | TIME NOT NULL | Hora de entrada (formato 24h) |
| hora_salida | TIME NOT NULL | Hora de salida (formato 24h) |
| tolerancia_min | INTEGER | Minutos de tolerancia (default: 15) |
| activo | BOOLEAN | Habilitado/deshabilitado (default: true) |
| created_at | DATETIME | Fecha de creación |

### Tabla: permisos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PK | ID único (autoincrement) |
| usuario_id | INTEGER FK | Referencia a usuarios.id |
| tipo | TEXT NOT NULL | "vacaciones", "permiso_medico", "personal" |
| fecha_inicio | DATE NOT NULL | Fecha de inicio |
| fecha_fin | DATE NOT NULL | Fecha de fin |
| motivo | TEXT | Descripción del permiso |
| estado | TEXT | "pendiente", "aprobado", "rechazado" (default: "pendiente") |
| created_at | DATETIME | Fecha de creación |

### Tabla: usuario_horario (relación M:N)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| usuario_id | INTEGER PK, FK | Referencia a usuarios.id |
| horario_id | INTEGER PK, FK | Referencia a horarios.id |

## API Endpoints

### Root

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Mensaje de bienvenida |
| GET | `/api/health` | Health check |

### Usuarios y Autenticación

| Método | Ruta | Body | Descripción |
|--------|------|------|-------------|
| POST | `/api/usuarios/registro` | nombre, email, password, rol, area, imagen_base64, imagenes_base64 | Crear usuario con registro facial |
| GET | `/api/usuarios/` | — | Listar todos los usuarios activos |
| GET | `/api/usuarios/{id}` | — | Obtener usuario por ID |
| PUT | `/api/usuarios/{id}` | nombre, email, rol, area, activo | Editar usuario |
| DELETE | `/api/usuarios/{id}` | — | Eliminar usuario (soft delete) |
| POST | `/api/usuarios/login` | email, password | Login con credenciales |
| POST | `/api/usuarios/login-facial` | imagen_base64 | Login con reconocimiento facial |

### Horarios por Usuario

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/usuarios/{id}/horarios` | Listar horarios asignados a un usuario |
| POST | `/api/usuarios/{id}/horarios/{horario_id}` | Asignar horario a usuario |
| DELETE | `/api/usuarios/{id}/horarios/{horario_id}` | Remover horario de usuario |

### Asistencia

| Método | Ruta | Body/Params | Descripción |
|--------|------|-------------|-------------|
| POST | `/api/asistencia/entrada` | imagen_base64 | Registrar entrada facial (valida duplicados) |
| POST | `/api/asistencia/salida` | imagen_base64 | Registrar salida facial (requiere entrada previa) |
| GET | `/api/asistencia/hoy` | — | Asistencia del día actual |
| GET | `/api/asistencia/estado-hoy/{usuario_id}` | — | Estado del día: horario, registros, retardo |
| GET | `/api/asistencia/usuario/{id}` | ?periodo=semana/mes/anio&fecha_ref=YYYY-MM-DD | Historial por usuario |
| GET | `/api/asistencia/area/{area}` | ?periodo=semana/mes/anio&fecha_ref=YYYY-MM-DD | Historial por área |

### Horarios

| Método | Ruta | Body | Descripción |
|--------|------|------|-------------|
| POST | `/api/horarios/` | nombre, hora_entrada ("HH:MM"), hora_salida ("HH:MM"), tolerancia_min | Crear horario |
| GET | `/api/horarios/` | — | Listar horarios activos |
| GET | `/api/horarios/{id}` | — | Obtener horario por ID |
| PUT | `/api/horarios/{id}` | nombre, hora_entrada, hora_salida, tolerancia_min, activo | Editar horario |
| DELETE | `/api/horarios/{id}` | — | Eliminar horario (soft delete) |

### Permisos

| Método | Ruta | Body/Params | Descripción |
|--------|------|-------------|-------------|
| POST | `/api/permisos/` | usuario_id, tipo, fecha_inicio, fecha_fin, motivo | Crear permiso |
| GET | `/api/permisos/` | ?periodo=semana/mes/anio&fecha_ref | Listar permisos |
| GET | `/api/permisos/usuario/{id}` | ?periodo=semana/mes/anio&fecha_ref | Historial por usuario |
| PUT | `/api/permisos/{id}` | tipo, fecha_inicio, fecha_fin, motivo, estado | Editar/aprobar/rechazar permiso |
| DELETE | `/api/permisos/{id}` | — | Eliminar permiso |

### Reportes

| Método | Ruta | Params | Descripción |
|--------|------|--------|-------------|
| GET | `/api/reportes/usuario/{id}` | ?periodo=semana/mes/anio&fecha_ref | Resumen por usuario (entradas, salidas, retardos, faltas, horas) |
| GET | `/api/reportes/area/{area}` | ?periodo=semana/mes/anio&fecha_ref | Resumen por área |
| GET | `/api/reportes/retardos` | ?periodo=semana/mes/anio&fecha_ref | Lista de retardos con detalle |
| GET | `/api/reportes/faltas` | ?periodo=semana/mes/anio&fecha_ref | Días sin asistencia (solo hasta hoy) |

## Flujo de Reconocimiento Facial

### Registro (5 fotos)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Captura 5  │────▶│  Extracción  │────▶│  Promedio   │
│   fotos     │     │  embedding   │     │  L2-norm    │
│  (ArcFace)  │     │  por foto    │     │  del vector │
└─────────────┘     └──────────────┘     └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │   Almacenar  │
                                        │   en BD como  │
                                        │   BLOB        │
                                        └─────────────┘
```

### Verificación

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Captura    │────▶│  Extracción  │────▶│  Comparar   │
│  en tiempo  │     │  embedding   │     │  con todos  │
│  real       │     │  (ArcFace)   │     │  los users  │
└─────────────┘     └──────────────┘     └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │  Si similitud│
                                        │  >= 0.45    │
                                        │  → MATCH    │
                                        └─────────────┘
```

## Instalación y Ejecución

### Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Instalar dependencias
pip install -r requirements.txt

# Crear usuario admin inicial
python seed_admin.py

# Ejecutar servidor
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

La API estará disponible en: `http://localhost:8000`
Documentación Swagger: `http://localhost:8000/docs`

### Frontend

```bash
cd my-expo-app

# Instalar dependencias
npm install

# Ejecutar en Expo
npx expo start
```

**Nota:** Para uso en dispositivo físico, cambia la IP en `services/api.ts` a la IP de tu máquina en la red local.

### Scripts Útiles

```bash
# Borrar todos los usuarios excepto el admin
cd backend
python limpiar_usuarios.py
```

## Credenciales por Defecto

- **Email:** admin@checador.com
- **Contraseña:** admin123

## Dependencias

### Backend (requirements.txt)

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.35
python-multipart==0.0.9
deepface==0.0.93
opencv-python-headless==4.10.0.84
numpy==1.26.4
Pillow==10.4.0
python-dotenv==1.0.1
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
bcrypt==4.2.0
retina-face==0.0.17
```

### Frontend (package.json principales)

```
expo ~54.0.36
react 19.1.0
react-native 0.81.5
zustand ^5.0.14
axios ^1.19.0
expo-camera ~17.0.10
expo-file-system ~19.0.23
@react-native-community/datetimepicker 8.4.4
@react-navigation/native (useFocusEffect)
```
