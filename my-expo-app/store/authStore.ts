import { create } from 'zustand';
import { Usuario, AuthState } from '../types';

export const useAuthStore = create<AuthState>((set, get) => ({
  usuario: null,
  token: null,
  login: (usuario: Usuario, token: string) => set({ usuario, token }),
  logout: () => set({ usuario: null, token: null }),
  isAdmin: () => get().usuario?.rol === 'admin',
}));
