import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listarHorarios, crearHorario, editarHorario, eliminarHorario } from '../../services/api';
import { Horario } from '../../types';

function to24h(hhmm: string, ampm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  let hour = h;
  if (ampm === 'AM') {
    hour = h === 12 ? 0 : h;
  } else {
    hour = h === 12 ? 12 : h + 12;
  }
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function to12h(hhmm: string): { time: string; ampm: string } {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { time: `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')}`, ampm };
}

function formatTime12(hhmm: string): string {
  const { time, ampm } = to12h(hhmm);
  return `${time} ${ampm}`;
}

function isValidTime(t: string): boolean {
  return /^\d{1,2}:\d{2}$/.test(t);
}

export default function HorariosScreen() {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [horaEntrada, setHoraEntrada] = useState('');
  const [horaSalida, setHoraSalida] = useState('');
  const [entradaAmPm, setEntradaAmPm] = useState<'AM' | 'PM'>('AM');
  const [salidaAmPm, setSalidaAmPm] = useState<'AM' | 'PM'>('AM');
  const [tolerancia, setTolerancia] = useState('15');

  const cargarHorarios = async () => {
    setLoading(true);
    try { const res = await listarHorarios(); setHorarios(res.data); }
    catch (e) { console.error(e); }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      cargarHorarios();
    }, [])
  );

  const abrirModal = (horario?: Horario) => {
    if (horario) {
      setEditingId(horario.id);
      setNombre(horario.nombre);
      const ent = to12h(horario.hora_entrada);
      const sal = to12h(horario.hora_salida);
      setHoraEntrada(ent.time);
      setHoraSalida(sal.time);
      setEntradaAmPm(ent.ampm as 'AM' | 'PM');
      setSalidaAmPm(sal.ampm as 'AM' | 'PM');
      setTolerancia(horario.tolerancia_min.toString());
    } else {
      setEditingId(null); setNombre(''); setHoraEntrada(''); setHoraSalida('');
      setEntradaAmPm('AM'); setSalidaAmPm('AM'); setTolerancia('15');
    }
    setModalVisible(true);
  };

  const handleGuardar = async () => {
    if (!nombre || !horaEntrada || !horaSalida) { Alert.alert('Error', 'Completa todos los campos'); return; }
    if (!isValidTime(horaEntrada) || !isValidTime(horaSalida)) {
      Alert.alert('Error', 'Formato de hora invalido. Usa H:MM o HH:MM');
      return;
    }
    setSaving(true);
    const entrada24 = to24h(horaEntrada, entradaAmPm);
    const salida24 = to24h(horaSalida, salidaAmPm);
    try {
      const data = { nombre, hora_entrada: entrada24, hora_salida: salida24, tolerancia_min: parseInt(tolerancia) || 15 };
      if (editingId) await editarHorario(editingId, data); else await crearHorario(data);
      setModalVisible(false); cargarHorarios();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'No se pudo guardar'); }
    setSaving(false);
  };

  const handleEliminar = (id: number) => {
    Alert.alert('Eliminar', '¿Eliminar este horario?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { try { await eliminarHorario(id); cargarHorarios(); } catch { Alert.alert('Error', 'No se pudo eliminar'); } } },
    ]);
  };

  return (
    <View style={s.screen}>
      <TouchableOpacity onPress={() => abrirModal()} style={s.newBtn}>
        <Text style={s.newBtnText}>+ Nuevo Horario</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={s.loadingText}>Cargando horarios...</Text>
        </View>
      ) : (
      <FlatList
        data={horarios}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.cardTitle}>{item.nombre}</Text>
            <Text style={s.cardSub}>
              {formatTime12(item.hora_entrada)} - {formatTime12(item.hora_salida)}
            </Text>
            <Text style={s.cardTol}>Tolerancia: {item.tolerancia_min} min</Text>
            <View style={s.actionRow}>
              <TouchableOpacity onPress={() => abrirModal(item)} style={s.editBtn}><Text style={s.editBtnText}>Editar</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => handleEliminar(item.id)} style={s.deleteBtn}><Text style={s.editBtnText}>Eliminar</Text></TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>{editingId ? 'Editar Horario' : 'Nuevo Horario'}</Text>

            <TextInput style={s.input} placeholder="Nombre (ej: Turno Matutino)" placeholderTextColor="#9ca3af" value={nombre} onChangeText={setNombre} />

            <Text style={s.label}>Hora de entrada</Text>
            <View style={s.timeRow}>
              <TextInput
                style={[s.input, s.timeInput]}
                placeholder="07:00"
                placeholderTextColor="#9ca3af"
                value={horaEntrada}
                onChangeText={setHoraEntrada}
                keyboardType="default"
              />
              <View style={s.ampmGroup}>
                <TouchableOpacity
                  style={[s.ampmBtn, entradaAmPm === 'AM' && s.ampmActive]}
                  onPress={() => setEntradaAmPm('AM')}
                >
                  <Text style={[s.ampmText, entradaAmPm === 'AM' && s.ampmTextActive]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.ampmBtn, entradaAmPm === 'PM' && s.ampmActive]}
                  onPress={() => setEntradaAmPm('PM')}
                >
                  <Text style={[s.ampmText, entradaAmPm === 'PM' && s.ampmTextActive]}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={s.label}>Hora de salida</Text>
            <View style={s.timeRow}>
              <TextInput
                style={[s.input, s.timeInput]}
                placeholder="17:00"
                placeholderTextColor="#9ca3af"
                value={horaSalida}
                onChangeText={setHoraSalida}
                keyboardType="default"
              />
              <View style={s.ampmGroup}>
                <TouchableOpacity
                  style={[s.ampmBtn, salidaAmPm === 'AM' && s.ampmActive]}
                  onPress={() => setSalidaAmPm('AM')}
                >
                  <Text style={[s.ampmText, salidaAmPm === 'AM' && s.ampmTextActive]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.ampmBtn, salidaAmPm === 'PM' && s.ampmActive]}
                  onPress={() => setSalidaAmPm('PM')}
                >
                  <Text style={[s.ampmText, salidaAmPm === 'PM' && s.ampmTextActive]}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TextInput style={s.input} placeholder="Tolerancia (minutos)" placeholderTextColor="#9ca3af" value={tolerancia} onChangeText={setTolerancia} keyboardType="numeric" />

            <View style={s.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={s.cancelBtn}><Text style={s.cancelBtnText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleGuardar} style={s.saveBtn} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Guardar</Text>}
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
  newBtn: { backgroundColor: '#2563eb', marginHorizontal: 16, marginTop: 16, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  newBtnText: { color: '#fff', fontWeight: 'bold' },
  card: { backgroundColor: '#fff', padding: 16, marginHorizontal: 16, marginTop: 12, borderRadius: 8 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  cardSub: { color: '#4b5563', fontSize: 15, marginTop: 2 },
  cardTol: { fontSize: 14, color: '#9ca3af', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  editBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
  deleteBtn: { backgroundColor: '#ef4444', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
  editBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24, gap: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: '#d1d5db', padding: 12, borderRadius: 8, fontSize: 16, color: '#1f2937' },
  timeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  timeInput: { flex: 1 },
  ampmGroup: { flexDirection: 'row', gap: 4 },
  ampmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  ampmActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  ampmText: { fontSize: 14, fontWeight: '700', color: '#6b7280' },
  ampmTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: '#e5e7eb', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
});
