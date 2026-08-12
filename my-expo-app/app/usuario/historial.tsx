import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { historialUsuario } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Asistencia } from '../../types';

type Periodo = 'semana' | 'mes' | 'anio';

export default function MiHistorialScreen() {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [loading, setLoading] = useState(true);
  const { usuario } = useAuthStore();

  useFocusEffect(
    useCallback(() => {
      if (usuario) {
        setLoading(true);
        historialUsuario(usuario.id, periodo)
          .then((res) => setAsistencias(res.data))
          .catch(console.error)
          .finally(() => setLoading(false));
      }
    }, [periodo, usuario])
  );

  const getResumen = () => {
    const entradas = asistencias.filter((a) => a.tipo === 'entrada').length;
    const salidas = asistencias.filter((a) => a.tipo === 'salida').length;
    return { entradas, salidas };
  };

  const resumen = getResumen();

  return (
    <View style={s.screen}>
      <View style={s.summaryCard}>
        <Text style={s.summaryTitle}>Resumen</Text>
        <View style={s.summaryRow}>
          <View style={s.summaryItem}>
            <Text style={s.summaryNumGreen}>{resumen.entradas}</Text>
            <Text style={s.summaryLabel}>Entradas</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryNumRed}>{resumen.salidas}</Text>
            <Text style={s.summaryLabel}>Salidas</Text>
          </View>
        </View>
      </View>

      <View style={s.periodRow}>
        {(['semana', 'mes', 'anio'] as Periodo[]).map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setPeriodo(p)}
            style={[s.periodBtn, periodo === p && s.periodBtnActive]}
          >
            <Text style={[s.periodText, periodo === p && s.periodTextActive]}>
              {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Año'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={s.loadingText}>Cargando historial...</Text>
        </View>
      ) : (
      <FlatList
        data={asistencias}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={s.item}>
            <View style={s.itemRow}>
              <Text style={s.itemDate}>{item.fecha}</Text>
              <View style={[s.badge, item.tipo === 'entrada' ? s.badgeGreen : s.badgeRed]}>
                <Text style={[s.badgeText, item.tipo === 'entrada' ? s.badgeTextGreen : s.badgeTextRed]}>
                  {item.tipo}
                </Text>
              </View>
            </View>
            <Text style={s.itemTime}>{item.hora}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={s.empty}>Sin registros para este período</Text>
        }
      />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f4f6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  summaryCard: { backgroundColor: '#fff', padding: 16, marginHorizontal: 16, marginTop: 16, borderRadius: 12 },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  summaryItem: { alignItems: 'center' },
  summaryNumGreen: { fontSize: 24, fontWeight: 'bold', color: '#16a34a' },
  summaryNumRed: { fontSize: 24, fontWeight: 'bold', color: '#dc2626' },
  summaryLabel: { fontSize: 14, color: '#6b7280' },
  periodRow: { flexDirection: 'row', gap: 8, padding: 16 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#fff' },
  periodBtnActive: { backgroundColor: '#16a34a' },
  periodText: { fontSize: 14, fontWeight: 'bold', color: '#6b7280' },
  periodTextActive: { color: '#fff' },
  item: { backgroundColor: '#fff', padding: 12, marginBottom: 8, borderRadius: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemDate: { fontWeight: 'bold', color: '#1f2937' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeRed: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
  badgeTextGreen: { color: '#15803d' },
  badgeTextRed: { color: '#dc2626' },
  itemTime: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 32 },
});
