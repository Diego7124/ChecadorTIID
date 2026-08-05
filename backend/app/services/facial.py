import os
import base64
import numpy as np
from pathlib import Path
from deepface import DeepFace

UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

MODEL_NAME = "ArcFace"
DETECTOR_BACKEND = "retinaface"
SIMILARITY_THRESHOLD = 0.45
NUM_REGISTRATION_IMAGES = 5


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8))


def save_face_image(usuario_id: int, image_base64: str, index: int = 0) -> str:
    img_dir = UPLOAD_DIR / str(usuario_id)
    img_dir.mkdir(exist_ok=True)

    img_data = base64.b64decode(image_base64)
    img_path = img_dir / f"face_{index}.jpg"
    img_path.write_bytes(img_data)
    return str(img_path)


def extract_embedding(image_path: str) -> np.ndarray | None:
    try:
        embedding_objs = DeepFace.represent(
            img_path=image_path,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True,
            align=True,
        )
        return np.array(embedding_objs[0]["embedding"])
    except Exception:
        return None


def register_face(usuario_id: int, images_base64: list[str]) -> tuple[list[str], np.ndarray]:
    valid_embeddings = []
    saved_paths = []

    for i, img_b64 in enumerate(images_base64):
        img_path = save_face_image(usuario_id, img_b64, i)
        embedding = extract_embedding(img_path)

        if embedding is not None:
            saved_paths.append(img_path)
            valid_embeddings.append(embedding)

    if not valid_embeddings:
        raise ValueError("No se pudo detectar un rostro en ninguna de las imágenes")

    avg_embedding = np.mean(valid_embeddings, axis=0)
    avg_embedding = avg_embedding / np.linalg.norm(avg_embedding)

    return saved_paths, avg_embedding


def register_face_single(usuario_id: int, image_base64: str) -> tuple[str, np.ndarray]:
    img_path = save_face_image(usuario_id, image_base64, 0)
    embedding = extract_embedding(img_path)

    if embedding is None:
        raise ValueError("No se pudo detectar un rostro en la imagen")

    embedding = embedding / np.linalg.norm(embedding)
    return img_path, embedding


def verify_face_against_all(image_base64: str, db_session) -> dict | None:
    from ..models import Usuario

    temp_dir = UPLOAD_DIR / "_temp"
    temp_dir.mkdir(exist_ok=True)
    temp_path = temp_dir / "temp_capture.jpg"

    img_data = base64.b64decode(image_base64)
    temp_path.write_bytes(img_data)

    try:
        capture_embedding = DeepFace.represent(
            img_path=str(temp_path),
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True,
            align=True,
        )[0]["embedding"]
    except Exception:
        return None
    finally:
        temp_path.unlink(missing_ok=True)

    capture_vec = np.array(capture_embedding)
    capture_vec = capture_vec / np.linalg.norm(capture_vec)

    usuarios = db_session.query(Usuario).filter(
        Usuario.activo == True,
        Usuario.embedding.isnot(None)
    ).all()

    best_match = None
    best_similarity = -1.0

    for usuario in usuarios:
        if usuario.embedding is None:
            continue

        stored_vec = np.frombuffer(usuario.embedding, dtype=np.float64)
        if stored_vec.shape != capture_vec.shape:
            try:
                stored_vec = np.frombuffer(usuario.embedding, dtype=np.float32)
            except Exception:
                continue

        similarity = cosine_similarity(capture_vec, stored_vec)

        if similarity > best_similarity:
            best_similarity = similarity
            best_match = usuario

    if best_match and best_similarity >= SIMILARITY_THRESHOLD:
        confidence = round(best_similarity * 100, 2)
        return {
            "usuario_id": best_match.id,
            "nombre": best_match.nombre,
            "confianza": confidence,
            "similitud": round(best_similarity, 4),
        }

    return None
