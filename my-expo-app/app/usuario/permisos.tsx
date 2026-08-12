import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { crearPermiso, historialPermisosUsuario, editarPermiso, eliminarPermiso } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Permiso } from '../../types';
import DateTimePicker from '@react-native-community/datetimepicker';

type Periodo = 'semana' | 'mes' | 'anio';

export default function PermisosScreen() {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [tipo, setTipo] = useState('personal');
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState(new Date());
  const [motivo, setMotivo] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [showInicio, setShowInicio] = useState(false);
  const [showFin, setShowFin] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { usuario } = useAuthStore();

  const cargarPermisos = async () => {
    if (!usuario) return;
    setLoading(true);
    try {
      const res = await historialPermisosUsuario(usuario.id, periodo);
      setPermisos(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      cargarPermisos();
    }, [periodo])
  );

  const abrirModal = (permiso?: Permiso) => {
    if (permiso) {
      setEditingId(permiso.id);
      setTipo(permiso.tipo);
      setFechaInicio(new Date(permiso.fecha_inicio));
      setFechaFin(new Date(permiso.fecha_fin));
      setMotivo(permiso.motivo);
    } else {
      setEditingId(null);
      setTipo('personal');
      setFechaInicio(new Date());
      setFechaFin(new Date());
      setMotivo('');
    }
    setModalVisible(true);
  };

  const handleGuardar = async () => {
    if (!usuario) return;
    setSaving(true);
    try {
      const data = {
        usuario_id: usuario.id,
        tipo,
        fecha_inicio: fechaInicio.toISOString().split('T')[0],
        fecha_fin: fechaFin.toISOString().split('T')[0],
        motivo,
      };
      if (editingId) {
        await editarPermiso(editingId, { tipo, fecha_inicio: data.fecha_inicio, fecha_fin: data.fecha_fin, motivo });
      } else {
        await crearPermiso(data);
      }
      setModalVisible(false);
      cargarPermisos();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'No se pudo guardar');
    }
    setSaving(false);
  };

  const handleEliminar = (id: number) => {
    Alert.alert('Eliminar', '¿Eliminar este permiso?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try { await eliminarPermiso(id); cargarPermisos(); }
          catch { Alert.alert('Error', 'No se pudo eliminar'); }
        },
      },
    ]);
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'aprobado': return { bg: '#dcfce7', text: '#15803d' };
      case 'rechazado': return { bg: '#fee2e2', text: '#dc2626' };
      default: return { bg: '#fef9c3', text: '#a16207' };
    }
  };

  return (
    <View style={s.screen}>
      <TouchableOpacity onPress={() => abrirModal()} style={s.newBtn}>
        <Text style={s.newBtnText}>+ Nuevo Permiso</Text>
      </TouchableOpacity>

      <View style={s.periodRow}>
        {(['semana', 'mes', 'anio'] as Periodo[]).map((p) => (
          <TouchableOpacity key={p} onPress={() => setPeriodo(p)} style={[s.periodBtn, periodo === p && s.periodBtnActive]}>
            <Text style={[s.periodText, periodo === p && s.periodTextActive]}>
              {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Año'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={s.loadingText}>Cargando permisos...</Text>
        </View>
      ) : (
      <FlatList
        data={permisos}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const ec = getEstadoColor(item.estado);
          return (
            <View style={s.card}>
              <View style={s.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{item.tipo}</Text>
                  <Text style={s.cardSub}>{item.fecha_inicio} al {item.fecha_fin}</Text>
                  {item.motivo ? <Text style={s.cardMotivo}>{item.motivo}</Text> : null}
                </View>
                <View style={[s.estadoBadge, { backgroundColor: ec.bg }]}>
                  <Text style={[s.estadoText, { color: ec.text }]}>{item.estado}</Text>
                </View>
              </View>
              {item.estado === 'pendiente' && (
                <View style={s.actionRow}>
                  <TouchableOpacity onPress={() => abrirModal(item)} style={s.editBtn}>
                    <Text style={s.editBtnText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleEliminar(item.id)} style={s.deleteBtn}>
                    <Text style={s.deleteBtnText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={s.empty}>No hay permisos registrados</Text>}
      />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>{editingId ? 'Editar Permiso' : 'Nuevo Permiso'}</Text>
            <View style={s.tipoRow}>
              {['personal', 'vacaciones', 'permiso_medico'].map((t) => (
                <TouchableOpacity key={t} onPress={() => setTipo(t)} style={[s.tipoBtn, tipo === t && s.tipoBtnActive]}>
                  <Text style={[s.tipoText, tipo === t && s.tipoTextActive]}>
                    {t === 'personal' ? 'Personal' : t === 'vacaciones' ? 'Vacaciones' : 'Médico'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => setShowInicio(true)} style={s.dateBtn}>
              <Text style={s.dateBtnText}>Inicio: {fechaInicio.toISOString().split('T')[0]}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowFin(true)} style={s.dateBtn}>
              <Text style={s.dateBtnText}>Fin: {fechaFin.toISOString().split('T')[0]}</Text>
            </TouchableOpacity>
            {showInicio && (
              <DateTimePicker value={fechaInicio} mode="date" onChange={(_, date) => { setShowInicio(false); if (date) setFechaInicio(date); }} />
            )}
            {showFin && (
              <DateTimePicker value={fechaFin} mode="date" onChange={(_, date) => { setShowFin(false); if (date) setFechaFin(date); }} />
            )}
            <TextInput style={s.modalInput} placeholder="Motivo (opcional)" value={motivo} onChangeText={setMotivo} multiline />
            <View style={s.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={s.cancelModalBtn}>
                <Text style={s.cancelModalText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleGuardar} style={s.saveModalBtn} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveModalText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f4f6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  newBtn: { backgroundColor: '#16a34a', marginHorizontal: 16, marginTop: 16, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  newBtnText: { color: '#fff', fontWeight: 'bold' },
  periodRow: { flexDirection: 'row', gap: 8, padding: 16 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#fff' },
  periodBtnActive: { backgroundColor: '#16a34a' },
  periodText: { fontSize: 14, fontWeight: 'bold', color: '#6b7280' },
  periodTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', padding: 16, marginBottom: 8, borderRadius: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontWeight: 'bold', color: '#1f2937', textTransform: 'capitalize' },
  cardSub: { fontSize: 14, color: '#6b7280' },
  cardMotivo: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  estadoBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  estadoText: { fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  editBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4 },
  editBtnText: { color: '#fff', fontSize: 14 },
  deleteBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4 },
  deleteBtnText: { color: '#fff', fontSize: 14 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 32 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24, gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  tipoRow: { flexDirection: 'row', gap: 8 },
  tipoBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#f3f4f6' },
  tipoBtnActive: { backgroundColor: '#16a34a' },
  tipoText: { fontSize: 12, color: '#6b7280' },
  tipoTextActive: { color: '#fff' },
  dateBtn: { borderWidth: 1, borderColor: '#d1d5db', padding: 12, borderRadius: 8 },
  dateBtnText: { color: '#374151' },
  modalInput: { borderWidth: 1, borderColor: '#d1d5db', padding: 12, borderRadius: 8 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelModalBtn: { flex: 1, backgroundColor: '#e5e7eb', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelModalText: { color: '#374151' },
  saveModalBtn: { flex: 1, backgroundColor: '#16a34a', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveModalText: { color: '#fff', fontWeight: 'bold' },
});
