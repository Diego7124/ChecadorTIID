import axios from 'axios';
import * as FileSystem from 'expo-file-system';

const API_URL = 'http://192.168.0.18:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

const imageToBase64 = async (uri: string): Promise<string> => {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });
  return base64;
};

// Auth
export const login = (email: string, password: string) =>
  api.post('/usuarios/login', { email, password });

export const loginFacial = (imagen_base64: string) =>
  api.post('/usuarios/login-facial', { imagen_base64 });

// Usuarios
export const registrarUsuario = (data: {
  nombre: string;
  email: string;
  password: string;
  rol: string;
  area: string;
  imagen_base64?: string;
  imagenes_base64?: string;
}) => api.post('/usuarios/registro', data);

export const listarUsuarios = () => api.get('/usuarios/');

export const obtenerUsuario = (id: number) => api.get(`/usuarios/${id}`);

export const editarUsuario = (id: number, data: Record<string, any>) =>
  api.put(`/usuarios/${id}`, data);

export const eliminarUsuario = (id: number) => api.delete(`/usuarios/${id}`);

// Asistencia
export const registrarAsistencia = (imagen_base64: string, tipo: string) =>
  api.post(`/asistencia/${tipo}`, { imagen_base64, tipo });

export const asistenciaHoy = () => api.get('/asistencia/hoy');

export const historialUsuario = (id: number, periodo: string, fecha?: string) => {
  const params = new URLSearchParams({ periodo });
  if (fecha) params.append('fecha_ref', fecha);
  return api.get(`/asistencia/usuario/${id}?${params.toString()}`);
};

export const historialArea = (area: string, periodo: string, fecha?: string) => {
  const params = new URLSearchParams({ periodo });
  if (fecha) params.append('fecha_ref', fecha);
  return api.get(`/asistencia/area/${encodeURIComponent(area)}?${params.toString()}`);
};

// Horarios
export const crearHorario = (data: {
  nombre: string;
  hora_entrada: string;
  hora_salida: string;
  tolerancia_min: number;
}) => api.post('/horarios/', data);

export const listarHorarios = () => api.get('/horarios/');

export const editarHorario = (id: number, data: Record<string, any>) =>
  api.put(`/horarios/${id}`, data);

export const eliminarHorario = (id: number) => api.delete(`/horarios/${id}`);

// Permisos
export const crearPermiso = (data: {
  usuario_id: number;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
}) => api.post('/permisos/', data);

export const listarPermisos = (periodo: string, fecha?: string) => {
  const params = new URLSearchParams({ periodo });
  if (fecha) params.append('fecha_ref', fecha);
  return api.get(`/permisos/?${params.toString()}`);
};

export const historialPermisosUsuario = (id: number, periodo: string, fecha?: string) => {
  const params = new URLSearchParams({ periodo });
  if (fecha) params.append('fecha_ref', fecha);
  return api.get(`/permisos/usuario/${id}?${params.toString()}`);
};

export const editarPermiso = (id: number, data: Record<string, any>) =>
  api.put(`/permisos/${id}`, data);

export const eliminarPermiso = (id: number) => api.delete(`/permisos/${id}`);

export default api;
