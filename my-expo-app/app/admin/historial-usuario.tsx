import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { historialUsuario, listarUsuarios } from '../../services/api';
import { Asistencia, Usuario } from '../../types';

type Periodo = 'semana' | 'mes' | 'anio';

export default function HistorialUsuarioScreen() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>('mes');

  useEffect(() => { listarUsuarios().then((res) => setUsuarios(res.data)).catch(console.error); }, []);

  useEffect(() => {
    if (selectedId) {
      historialUsuario(selectedId, periodo).then((res) => setAsistencias(res.data)).catch(console.error);
    }
  }, [selectedId, periodo]);

  return (
    <View style={s.screen}>
      <View style={s.userSection}>
        <Text style={s.sectionLabel}>Seleccionar usuario:</Text>
        <FlatList
          horizontal
          data={usuarios}
          keyExtractor={(item) => item.id.toString()}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setSelectedId(item.id)} style={[s.userChip, selectedId === item.id && s.userChipActive]}>
              <Text style={[s.userChipText, selectedId === item.id && s.userChipTextActive]}>{item.nombre}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={s.periodRow}>
        {(['semana', 'mes', 'anio'] as Periodo[]).map((p) => (
          <TouchableOpacity key={p} onPress={() => setPeriodo(p)} style={[s.periodBtn, periodo === p && s.periodBtnActive]}>
            <Text style={[s.periodText, periodo === p && s.periodTextActive]}>
              {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Año'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={asistencias}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardRow}>
              <Text style={s.cardDate}>{item.fecha}</Text>
              <View style={[s.badge, item.tipo === 'entrada' ? s.badgeGreen : s.badgeRed]}>
                <Text style={[s.badgeText, item.tipo === 'entrada' ? s.badgeTextGreen : s.badgeTextRed]}>{item.tipo}</Text>
              </View>
            </View>
            <Text style={s.cardTime}>{item.hora}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={s.empty}>{selectedId ? 'Sin registros para este período' : 'Selecciona un usuario'}</Text>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f4f6' },
  userSection: { padding: 16 },
  sectionLabel: { fontSize: 14, fontWeight: 'bold', color: '#4b5563', marginBottom: 8 },
  userChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8, backgroundColor: '#fff' },
  userChipActive: { backgroundColor: '#2563eb' },
  userChipText: { fontSize: 14, color: '#374151' },
  userChipTextActive: { color: '#fff' },
  periodRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#fff' },
  periodBtnActive: { backgroundColor: '#2563eb' },
  periodText: { fontSize: 14, fontWeight: 'bold', color: '#6b7280' },
  periodTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', padding: 12, marginBottom: 8, borderRadius: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontWeight: 'bold', color: '#1f2937' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeRed: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
  badgeTextGreen: { color: '#15803d' },
  badgeTextRed: { color: '#dc2626' },
  cardTime: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 32 },
});
