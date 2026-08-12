import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listarPermisos, editarPermiso } from '../../services/api';
import { Permiso } from '../../types';

type Periodo = 'semana' | 'mes' | 'anio';

export default function VacacionesScreen() {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const cargarPermisos = async () => {
    setLoading(true);
    try { const res = await listarPermisos(periodo); setPermisos(res.data); }
    catch (e) { console.error(e); }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      cargarPermisos();
    }, [periodo])
  );

  const handleEstado = async (id: number, estado: string) => {
    setActionLoading(id);
    try { await editarPermiso(id, { estado }); Alert.alert('Exito', `Permiso ${estado}`); cargarPermisos(); }
    catch { Alert.alert('Error', 'No se pudo actualizar'); }
    setActionLoading(null);
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
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={s.loadingText}>Cargando permisos...</Text>
        </View>
      ) : (
      <FlatList
        data={permisos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const ec = getEstadoColor(item.estado);
          return (
            <View style={s.card}>
              <View style={s.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>Usuario #{item.usuario_id}</Text>
                  <Text style={s.cardSub}>{item.tipo}</Text>
                  <Text style={s.cardSub}>{item.fecha_inicio} al {item.fecha_fin}</Text>
                  {item.motivo ? <Text style={s.cardMotivo}>{item.motivo}</Text> : null}
                </View>
                <View style={[s.estadoBadge, { backgroundColor: ec.bg }]}>
                  <Text style={[s.estadoText, { color: ec.text }]}>{item.estado}</Text>
                </View>
              </View>
              {item.estado === 'pendiente' && (
                <View style={s.actionRow}>
                  <TouchableOpacity onPress={() => handleEstado(item.id, 'aprobado')} style={s.aprobarBtn} disabled={actionLoading === item.id}>
                    {actionLoading === item.id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.aprobarBtnText}>Aprobar</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleEstado(item.id, 'rechazado')} style={s.rechazarBtn} disabled={actionLoading === item.id}>
                    {actionLoading === item.id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.rechazarBtnText}>Rechazar</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<Text style={s.empty}>No hay permisos registrados</Text>}
      />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f4f6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  periodRow: { flexDirection: 'row', gap: 8, padding: 16 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#fff' },
  periodBtnActive: { backgroundColor: '#2563eb' },
  periodText: { fontSize: 14, fontWeight: 'bold', color: '#6b7280' },
  periodTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', padding: 16, marginHorizontal: 16, marginBottom: 8, borderRadius: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontWeight: 'bold', color: '#1f2937' },
  cardSub: { fontSize: 14, color: '#6b7280' },
  cardMotivo: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  estadoBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  estadoText: { fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  aprobarBtn: { flex: 1, backgroundColor: '#22c55e', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  aprobarBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  rechazarBtn: { flex: 1, backgroundColor: '#ef4444', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  rechazarBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 32 },
});
