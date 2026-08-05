import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { historialArea } from '../../services/api';
import { Asistencia } from '../../types';

type Periodo = 'semana' | 'mes' | 'anio';
const AREAS = ['RH', 'Administrativos', 'Sistemas', 'Contabilidad', 'Ventas'];

export default function HistorialAreaScreen() {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>('mes');

  const cargarHistorial = async (area: string, p: Periodo) => {
    try { const res = await historialArea(area, p); setAsistencias(res.data); }
    catch (e) { console.error(e); }
  };

  const seleccionarArea = (area: string) => { setSelectedArea(area); cargarHistorial(area, periodo); };
  const cambiarPeriodo = (p: Periodo) => { setPeriodo(p); if (selectedArea) cargarHistorial(selectedArea, p); };

  return (
    <View style={s.screen}>
      <View style={s.areaSection}>
        <Text style={s.sectionLabel}>Seleccionar área:</Text>
        <View style={s.areaRow}>
          {AREAS.map((area) => (
            <TouchableOpacity key={area} onPress={() => seleccionarArea(area)} style={[s.areaChip, selectedArea === area && s.areaChipActive]}>
              <Text style={[s.areaChipText, selectedArea === area && s.areaChipTextActive]}>{area}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {selectedArea && (
        <View style={s.periodRow}>
          {(['semana', 'mes', 'anio'] as Periodo[]).map((p) => (
            <TouchableOpacity key={p} onPress={() => cambiarPeriodo(p)} style={[s.periodBtn, periodo === p && s.periodBtnActive]}>
              <Text style={[s.periodText, periodo === p && s.periodTextActive]}>
                {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Año'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={asistencias}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardRow}>
              <View>
                <Text style={s.cardName}>{item.nombre_usuario}</Text>
                <Text style={s.cardSub}>{item.fecha} - {item.hora}</Text>
              </View>
              <View style={[s.badge, item.tipo === 'entrada' ? s.badgeGreen : s.badgeRed]}>
                <Text style={[s.badgeText, item.tipo === 'entrada' ? s.badgeTextGreen : s.badgeTextRed]}>{item.tipo}</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={s.empty}>{selectedArea ? 'Sin registros para este período' : 'Selecciona un área'}</Text>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f4f6' },
  areaSection: { padding: 16 },
  sectionLabel: { fontSize: 14, fontWeight: 'bold', color: '#4b5563', marginBottom: 8 },
  areaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  areaChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fff' },
  areaChipActive: { backgroundColor: '#2563eb' },
  areaChipText: { fontSize: 14, color: '#374151' },
  areaChipTextActive: { color: '#fff' },
  periodRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#fff' },
  periodBtnActive: { backgroundColor: '#2563eb' },
  periodText: { fontSize: 14, fontWeight: 'bold', color: '#6b7280' },
  periodTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', padding: 12, marginBottom: 8, borderRadius: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontWeight: 'bold', color: '#1f2937' },
  cardSub: { fontSize: 14, color: '#6b7280' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeRed: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
  badgeTextGreen: { color: '#15803d' },
  badgeTextRed: { color: '#dc2626' },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 32 },
});
