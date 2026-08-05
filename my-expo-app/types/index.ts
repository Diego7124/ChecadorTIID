export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  area: string;
  imagen_rostro: string;
  activo: boolean;
  created_at: string;
}

export interface Asistencia {
  id: number;
  usuario_id: number;
  nombre_usuario: string;
  tipo: string;
  fecha: string;
  hora: string;
  confianza: number;
  created_at: string;
}

export interface Horario {
  id: number;
  nombre: string;
  hora_entrada: string;
  hora_salida: string;
  tolerancia_min: number;
  activo: boolean;
  created_at: string;
}

export interface Permiso {
  id: number;
  usuario_id: number;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  estado: string;
  created_at: string;
}

export interface AuthState {
  usuario: Usuario | null;
  token: string | null;
  login: (usuario: Usuario, token: string) => void;
  logout: () => void;
  isAdmin: () => boolean;
}
