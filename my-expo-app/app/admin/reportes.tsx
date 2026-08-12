import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  listarUsuarios,
  reporteUsuario, reporteRetardos, reporteFaltas,
} from '../../services/api';

type Tab = 'usuarios' | 'retardos' | 'faltas';
type Periodo = 'semana' | 'mes' | 'anio';

interface ResumenUsuario {
  usuario_id: number;
  nombre: string;
  email: string;
  area: string;
  horario: string;
  total_entradas: number;
  total_salidas: number;
  total_retardos: number;
  total_faltas: number;
  horas_trabajadas: number;
}

interface Retraso {
  usuario_id: number;
  nombre: string;
  area: string;
  fecha: string;
  hora_programada: string;
  hora_real: string;
  retraso_min: number;
}

interface Falta {
  usuario_id: number;
  nombre: string;
  email: string;
  area: string;
  fecha: string;
  dia_semana: string;
}

export default function ReportesScreen() {
  const [tab, setTab] = useState<Tab>('usuarios');
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<ResumenUsuario[]>([]);
  const [retardos, setRetardos] = useState<Retraso[]>([]);
  const [faltas, setFaltas] = useState<Falta[]>([]);
  const [selectedUser, setSelectedUser] = useState<ResumenUsuario | null>(null);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      if (tab === 'usuarios') {
        const resU = await listarUsuarios();
        const lista = resU.data.filter((u: any) => u.rol !== 'admin');
        const resumenes: ResumenUsuario[] = [];
        for (const u of lista) {
          try {
            const res = await reporteUsuario(u.id, periodo);
            resumenes.push(res.data);
          } catch { }
        }
        setUsuarios(resumenes);
        setSelectedUser(null);
      } else if (tab === 'retardos') {
        const res = await reporteRetardos(periodo);
        setRetardos(res.data);
      } else if (tab === 'faltas') {
        const res = await reporteFaltas(periodo);
        setFaltas(res.data);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [tab, periodo])
  );

  const getColor = (valor: number, max: number) => {
    if (valor === 0) return '#22c55e';
    if (valor <= max * 0.3) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <View style={s.screen}>
      <View style={s.tabRow}>
        {([
          { key: 'usuarios' as Tab, label: 'Por Usuario' },
          { key: 'retardos' as Tab, label: 'Retardos' },
          { key: 'faltas' as Tab, label: 'Faltas' },
        ]).map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[s.tabBtn, tab === t.key && s.tabBtnActive]}
          >
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.periodRow}>
        {(['semana', 'mes', 'anio'] as Periodo[]).map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setPeriodo(p)}
            style={[s.periodBtn, periodo === p && s.periodBtnActive]}
          >
            <Text style={[s.periodText, periodo === p && s.periodTextActive]}>
              {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Anio'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={s.loadingText}>Generando reporte...</Text>
        </View>
      ) : tab === 'usuarios' ? (
        selectedUser ? (
          <View style={s.detailContainer}>
            <TouchableOpacity onPress={() => setSelectedUser(null)} style={s.backBtn}>
              <Text style={s.backBtnText}>← Volver al reporte</Text>
            </TouchableOpacity>

            <View style={s.detailCard}>
              <View style={s.detailHeader}>
                <View style={s.detailAvatar}>
                  <Text style={s.detailAvatarText}>{selectedUser.nombre.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={s.detailName}>{selectedUser.nombre}</Text>
                  <Text style={s.detailSub}>{selectedUser.email}</Text>
                  <Text style={s.detailSub}>Area: {selectedUser.area || 'Sin area'}</Text>
                  <Text style={s.detailSub}>Horario: {selectedUser.horario || 'Sin horario'}</Text>
                </View>
              </View>
            </View>

            <View style={s.statsGrid}>
              <View style={[s.statCard, { borderLeftColor: '#22c55e' }]}>
                <Text style={s.statNum}>{selectedUser.total_entradas}</Text>
                <Text style={s.statLabel}>Entradas</Text>
              </View>
              <View style={[s.statCard, { borderLeftColor: '#3b82f6' }]}>
                <Text style={s.statNum}>{selectedUser.total_salidas}</Text>
                <Text style={s.statLabel}>Salidas</Text>
              </View>
              <View style={[s.statCard, { borderLeftColor: '#f59e0b' }]}>
                <Text style={[s.statNum, { color: '#f59e0b' }]}>{selectedUser.total_retardos}</Text>
                <Text style={s.statLabel}>Retardos</Text>
              </View>
              <View style={[s.statCard, { borderLeftColor: '#ef4444' }]}>
                <Text style={[s.statNum, { color: '#ef4444' }]}>{selectedUser.total_faltas}</Text>
                <Text style={s.statLabel}>Faltas</Text>
              </View>
            </View>

            <View style={s.hoursCard}>
              <Text style={s.hoursLabel}>Horas totales trabajadas</Text>
              <Text style={s.hoursNum}>{selectedUser.horas_trabajadas} hrs</Text>
            </View>
          </View>
        ) : (
          <FlatList
            data={usuarios}
            keyExtractor={(item) => item.usuario_id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.userCard} onPress={() => setSelectedUser(item)} activeOpacity={0.7}>
                <View style={s.userCardLeft}>
                  <View style={s.userAvatar}>
                    <Text style={s.userAvatarText}>{item.nombre.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.userName}>{item.nombre}</Text>
                    <Text style={s.userArea}>{item.area || 'Sin area'}</Text>
                  </View>
                </View>
                <View style={s.userStats}>
                  <View style={[s.miniStat, { backgroundColor: '#dcfce7' }]}>
                    <Text style={[s.miniStatNum, { color: '#16a34a' }]}>{item.total_entradas}</Text>
                  </View>
                  {item.total_retardos > 0 && (
                    <View style={[s.miniStat, { backgroundColor: '#fef3c7' }]}>
                      <Text style={[s.miniStatNum, { color: '#b45309' }]}>{item.total_retardos}r</Text>
                    </View>
                  )}
                  {item.total_faltas > 0 && (
                    <View style={[s.miniStat, { backgroundColor: '#fee2e2' }]}>
                      <Text style={[s.miniStatNum, { color: '#dc2626' }]}>{item.total_faltas}f</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={<Text style={s.empty}>No hay datos para mostrar</Text>}
          />
        )
      ) : tab === 'retardos' ? (
        <FlatList
          data={retardos}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => (
            <View style={s.recordCard}>
              <View style={s.recordHeader}>
                <Text style={s.recordName}>{item.nombre}</Text>
                <View style={[s.delayBadge]}>
                  <Text style={s.delayText}>+{item.retraso_min} min</Text>
                </View>
              </View>
              <Text style={s.recordSub}>{item.fecha} - {item.area || 'Sin area'}</Text>
              <Text style={s.recordDetail}>
                Programada: {item.hora_programada} → Real: {item.hora_real}
              </Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={s.empty}>No hay retardos en este periodo</Text>}
        />
      ) : (
        <FlatList
          data={faltas}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => (
            <View style={s.recordCard}>
              <View style={s.recordHeader}>
                <Text style={s.recordName}>{item.nombre}</Text>
                <View style={s.absenceBadge}>
                  <Text style={s.absenceText}>Falta</Text>
                </View>
              </View>
              <Text style={s.recordSub}>{item.dia_semana} {item.fecha}</Text>
              <Text style={s.recordDetail}>{item.email}</Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={s.empty}>No hay faltas en este periodo</Text>}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f4f6' },
  tabRow: { flexDirection: 'row', gap: 6, padding: 12, paddingBottom: 0 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: '#fff' },
  tabBtnActive: { backgroundColor: '#2563eb' },
  tabText: { fontSize: 13, fontWeight: 'bold', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  periodRow: { flexDirection: 'row', gap: 6, padding: 12 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#fff' },
  periodBtnActive: { backgroundColor: '#1e40af' },
  periodText: { fontSize: 13, fontWeight: 'bold', color: '#6b7280' },
  periodTextActive: { color: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },

  // User list
  userCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
  },
  userCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
  userAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
  userName: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  userArea: { fontSize: 12, color: '#9ca3af' },
  userStats: { flexDirection: 'row', gap: 4 },
  miniStat: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  miniStatNum: { fontSize: 13, fontWeight: 'bold' },

  // Detail
  detailContainer: { flex: 1, padding: 12 },
  backBtn: { marginBottom: 12 },
  backBtnText: { color: '#2563eb', fontWeight: '600', fontSize: 14 },
  detailCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  detailHeader: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  detailAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
  detailAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 24 },
  detailName: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  detailSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
  },
  statNum: { fontSize: 28, fontWeight: '800', color: '#1f2937' },
  statLabel: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  hoursCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center' },
  hoursLabel: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  hoursNum: { fontSize: 32, fontWeight: '800', color: '#2563eb', marginTop: 4 },

  // Records
  recordCard: {
    backgroundColor: '#fff',
    padding: 14,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
  },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recordName: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  delayBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  delayText: { fontSize: 13, fontWeight: 'bold', color: '#b45309' },
  absenceBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  absenceText: { fontSize: 13, fontWeight: 'bold', color: '#dc2626' },
  recordSub: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  recordDetail: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
});
