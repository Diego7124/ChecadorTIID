import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  listarUsuarios, listarHorarios, listarHorariosUsuario,
  asignarHorario, desasignarHorario,
} from '../../services/api';
import { Usuario, Horario } from '../../types';

export default function AsignarHorarioScreen() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [userHorarios, setUserHorarios] = useState<Horario[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingModal, setLoadingModal] = useState(false);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resU, resH] = await Promise.all([listarUsuarios(), listarHorarios()]);
      setUsuarios(resU.data);
      setHorarios(resH.data);
    } catch (e: any) {
      Alert.alert('Error', 'No se pudieron cargar los datos');
      console.error(e);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const abrirModal = async (usuario: Usuario) => {
    setSelectedUser(usuario);
    setLoadingModal(true);
    setModalVisible(true);
    try {
      const res = await listarHorariosUsuario(usuario.id);
      setUserHorarios(res.data);
    } catch {
      setUserHorarios([]);
    }
    setLoadingModal(false);
  };

  const toggleHorario = async (horario: Horario) => {
    if (!selectedUser) return;
    const yaAsignado = userHorarios.some(h => h.id === horario.id);
    try {
      if (yaAsignado) {
        await desasignarHorario(selectedUser.id, horario.id);
        setUserHorarios(prev => prev.filter(h => h.id !== horario.id));
      } else {
        await asignarHorario(selectedUser.id, horario.id);
        setUserHorarios(prev => [...prev, horario]);
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo actualizar');
    }
  };

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={s.loadingText}>Cargando usuarios...</Text>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      {usuarios.length === 0 ? (
        <View style={s.centered}>
          <Text style={s.emptyIcon}>👥</Text>
          <Text style={s.emptyTitle}>No hay usuarios</Text>
          <Text style={s.emptySub}>Registra usuarios primero desde la pestaña "Registrar"</Text>
        </View>
      ) : (
        <FlatList
          data={usuarios}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => abrirModal(item)} activeOpacity={0.7}>
              <View style={s.cardLeft}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{item.nombre.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={s.cardName}>{item.nombre}</Text>
                  <Text style={s.cardEmail}>{item.email}</Text>
                </View>
              </View>
              <Text style={s.arrow}>›</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Horarios de</Text>
                <Text style={s.modalUserName}>{selectedUser?.nombre}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={s.closeBtn}>
                <Text style={s.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingModal ? (
              <View style={s.modalLoading}>
                <ActivityIndicator size="large" color="#2563eb" />
              </View>
            ) : horarios.length === 0 ? (
              <View style={s.modalLoading}>
                <Text style={s.emptyIcon}>🕐</Text>
                <Text style={s.emptyTitle}>No hay horarios creados</Text>
                <Text style={s.emptySub}>Crea horarios primero en la pestaña "Horarios"</Text>
              </View>
            ) : (
              <FlatList
                data={horarios}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => {
                  const asignado = userHorarios.some(h => h.id === item.id);
                  return (
                    <TouchableOpacity
                      style={[s.horarioItem, asignado && s.horarioItemActive]}
                      onPress={() => toggleHorario(item)}
                      activeOpacity={0.7}
                    >
                      <View style={s.horarioInfo}>
                        <Text style={[s.horarioName, asignado && s.horarioNameActive]}>{item.nombre}</Text>
                        <Text style={[s.horarioTime, asignado && s.horarioTimeActive]}>
                          {item.hora_entrada} - {item.hora_salida}
                        </Text>
                        <Text style={[s.horarioTol, asignado && s.horarioTolActive]}>
                          Tolerancia: {item.tolerancia_min} min
                        </Text>
                      </View>
                      <View style={[s.check, asignado && s.checkActive]}>
                        {asignado && <Text style={s.checkText}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={{ paddingBottom: 10 }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f4f6' },
  centered: { flex: 1, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  card: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  cardEmail: { fontSize: 13, color: '#6b7280' },
  arrow: { fontSize: 24, color: '#9ca3af' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 14, color: '#6b7280' },
  modalUserName: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { fontSize: 16, color: '#6b7280' },
  modalLoading: { paddingVertical: 40, alignItems: 'center' },
  horarioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  horarioItemActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  horarioInfo: {},
  horarioName: { fontSize: 15, fontWeight: '600', color: '#374151' },
  horarioNameActive: { color: '#2563eb' },
  horarioTime: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  horarioTimeActive: { color: '#60a5fa' },
  horarioTol: { fontSize: 12, color: '#d1d5db', marginTop: 2 },
  horarioTolActive: { color: '#93c5fd' },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
