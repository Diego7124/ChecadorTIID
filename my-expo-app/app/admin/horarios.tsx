import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, Modal, StyleSheet } from 'react-native';
import { listarHorarios, crearHorario, editarHorario, eliminarHorario } from '../../services/api';
import { Horario } from '../../types';

export default function HorariosScreen() {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [horaEntrada, setHoraEntrada] = useState('');
  const [horaSalida, setHoraSalida] = useState('');
  const [tolerancia, setTolerancia] = useState('15');

  const cargarHorarios = async () => {
    try { const res = await listarHorarios(); setHorarios(res.data); }
    catch (e) { console.error(e); }
  };

  useEffect(() => { cargarHorarios(); }, []);

  const abrirModal = (horario?: Horario) => {
    if (horario) {
      setEditingId(horario.id); setNombre(horario.nombre);
      setHoraEntrada(horario.hora_entrada); setHoraSalida(horario.hora_salida);
      setTolerancia(horario.tolerancia_min.toString());
    } else {
      setEditingId(null); setNombre(''); setHoraEntrada(''); setHoraSalida(''); setTolerancia('15');
    }
    setModalVisible(true);
  };

  const handleGuardar = async () => {
    if (!nombre || !horaEntrada || !horaSalida) { Alert.alert('Error', 'Completa todos los campos'); return; }
    try {
      const data = { nombre, hora_entrada: horaEntrada, hora_salida: horaSalida, tolerancia_min: parseInt(tolerancia) || 15 };
      if (editingId) await editarHorario(editingId, data); else await crearHorario(data);
      setModalVisible(false); cargarHorarios();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'No se pudo guardar'); }
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

      <FlatList
        data={horarios}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.cardTitle}>{item.nombre}</Text>
            <Text style={s.cardSub}>{item.hora_entrada} - {item.hora_salida}</Text>
            <Text style={s.cardTol}>Tolerancia: {item.tolerancia_min} min</Text>
            <View style={s.actionRow}>
              <TouchableOpacity onPress={() => abrirModal(item)} style={s.editBtn}><Text style={s.editBtnText}>Editar</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => handleEliminar(item.id)} style={s.deleteBtn}><Text style={s.deleteBtnText}>Eliminar</Text></TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>{editingId ? 'Editar Horario' : 'Nuevo Horario'}</Text>
            <TextInput style={s.input} placeholder="Nombre (ej: Turno Matutino)" value={nombre} onChangeText={setNombre} />
            <TextInput style={s.input} placeholder="Hora entrada (HH:MM)" value={horaEntrada} onChangeText={setHoraEntrada} />
            <TextInput style={s.input} placeholder="Hora salida (HH:MM)" value={horaSalida} onChangeText={setHoraSalida} />
            <TextInput style={s.input} placeholder="Tolerancia (minutos)" value={tolerancia} onChangeText={setTolerancia} keyboardType="numeric" />
            <View style={s.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={s.cancelBtn}><Text style={s.cancelBtnText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleGuardar} style={s.saveBtn}><Text style={s.saveBtnText}>Guardar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f4f6' },
  newBtn: { backgroundColor: '#2563eb', marginHorizontal: 16, marginTop: 16, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  newBtnText: { color: '#fff', fontWeight: 'bold' },
  card: { backgroundColor: '#fff', padding: 16, marginHorizontal: 16, marginTop: 12, borderRadius: 8 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  cardSub: { color: '#4b5563' },
  cardTol: { fontSize: 14, color: '#9ca3af' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4 },
  editBtnText: { color: '#fff', fontSize: 14 },
  deleteBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4 },
  deleteBtnText: { color: '#fff', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24, gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  input: { borderWidth: 1, borderColor: '#d1d5db', padding: 12, borderRadius: 8 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: '#e5e7eb', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelBtnText: { color: '#374151' },
  saveBtn: { flex: 1, backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
});
