import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { listarUsuarios, eliminarUsuario } from '../../services/api';
import { Usuario } from '../../types';

export default function UsuariosScreen() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const res = await listarUsuarios();
      setUsuarios(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      cargarUsuarios();
    }, [])
  );

  const handleEliminar = (id: number, nombre: string) => {
    Alert.alert('Eliminar', `¿Eliminar a ${nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { try { await eliminarUsuario(id); cargarUsuarios(); } catch { Alert.alert('Error', 'No se pudo eliminar'); } } },
    ]);
  };

  const renderItem = ({ item }: { item: Usuario }) => (
    <View style={s.card}>
      <View style={s.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardName}>{item.nombre}</Text>
          <Text style={s.cardEmail}>{item.email}</Text>
          <View style={s.tags}>
            <View style={s.rolBadge}><Text style={s.rolText}>{item.rol}</Text></View>
            {item.area ? <View style={s.areaBadge}><Text style={s.areaText}>{item.area}</Text></View> : null}
          </View>
        </View>
        <TouchableOpacity onPress={() => handleEliminar(item.id, item.nombre)} style={s.deleteBtn}>
          <Text style={s.deleteBtnText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={s.screen}>
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={s.loadingText}>Cargando usuarios...</Text>
        </View>
      ) : (
      <FlatList
        data={usuarios}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 12 }}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Text style={s.emptyText}>No hay usuarios registrados</Text>
          </View>
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
  card: { backgroundColor: '#fff', padding: 16, marginHorizontal: 16, marginBottom: 8, borderRadius: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  cardEmail: { fontSize: 14, color: '#6b7280' },
  tags: { flexDirection: 'row', gap: 8, marginTop: 4 },
  rolBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  rolText: { color: '#1d4ed8', fontSize: 12 },
  areaBadge: { backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  areaText: { color: '#4b5563', fontSize: 12 },
  deleteBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4 },
  deleteBtnText: { color: '#fff', fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 32 },
  emptyText: { color: '#6b7280', fontSize: 16 },
});
