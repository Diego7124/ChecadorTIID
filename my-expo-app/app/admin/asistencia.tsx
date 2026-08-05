import { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { registrarAsistencia, asistenciaHoy } from '../../services/api';
import { Asistencia } from '../../types';

export default function AsistenciaScreen() {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [tipo, setTipo] = useState<'entrada' | 'salida'>('entrada');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const cargarAsistencias = async () => {
    try { const res = await asistenciaHoy(); setAsistencias(res.data); }
    catch (e) { console.error(e); }
  };

  useEffect(() => { cargarAsistencias(); }, []);

  const abrirCamara = async (t: 'entrada' | 'salida') => {
    if (!permission?.granted) { await requestPermission(); return; }
    setTipo(t);
    setShowCamera(true);
  };

  const capturar = async () => {
    if (!cameraRef.current || loading) return;
    setLoading(true);

    let count = 3;
    setCountdown(count);
    const timer = setInterval(async () => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        setCountdown(0);
        try {
          const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
          let b64 = photo.base64;
          if (!b64) {
            b64 = await FileSystem.readAsStringAsync(photo.uri, { encoding: 'base64' });
          }
          setShowCamera(false);
          await registrarAsistencia(b64, tipo);
          Alert.alert('Éxito', `${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada`);
          cargarAsistencias();
        } catch (e: any) {
          Alert.alert('Error', e.response?.data?.detail || e.message || 'No se pudo registrar asistencia');
        } finally { setLoading(false); }
      }
    }, 1000);
  };

  if (showCamera) {
    return (
      <View style={s.black}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />
        <View style={s.overlay}>
          <View style={s.topInfo}>
            <Text style={s.overlayTitle}>Registrar {tipo}</Text>
            <Text style={s.overlaySub}>Coloca tu rostro en el óvalo</Text>
          </View>

          <View style={s.ovalContainer}>
            <View style={s.oval} />
          </View>

          {countdown > 0 ? (
            <View style={s.countdownContainer}>
              <Text style={s.countdownText}>{countdown}</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={capturar} style={s.captureBtn} disabled={loading}>
              <Text style={s.captureBtnText}>{loading ? 'Procesando...' : 'Capturar'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => setShowCamera(false)} style={s.cancelBtnArea}>
            <Text style={s.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <View style={s.btnRow}>
        <TouchableOpacity onPress={() => abrirCamara('entrada')} style={s.entradaBtn}>
          <Text style={s.btnWhite}>Entrada</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => abrirCamara('salida')} style={s.salidaBtn}>
          <Text style={s.btnWhite}>Salida</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.sectionTitle}>Asistencia del día</Text>

      <FlatList
        data={asistencias}
        keyExtractor={(item) => item.id.toString()}
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
            <Text style={s.confianza}>Confianza: {item.confianza.toFixed(1)}%</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<Text style={s.empty}>No hay registros hoy</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  topInfo: { alignItems: 'center' },
  overlayTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', textTransform: 'capitalize' },
  overlaySub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
  ovalContainer: { alignItems: 'center', justifyContent: 'center' },
  oval: { width: 200, height: 260, borderWidth: 3, borderColor: '#22c55e', borderRadius: 100, borderStyle: 'dashed' },
  countdownContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  countdownText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  captureBtn: { backgroundColor: '#fff', paddingHorizontal: 48, paddingVertical: 18, borderRadius: 999 },
  captureBtnText: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  cancelBtnArea: { paddingVertical: 8 },
  cancelText: { color: 'rgba(255,255,255,0.7)', fontSize: 16 },
  screen: { flex: 1, backgroundColor: '#f3f4f6' },
  btnRow: { flexDirection: 'row', gap: 12, padding: 16 },
  entradaBtn: { flex: 1, backgroundColor: '#22c55e', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  salidaBtn: { flex: 1, backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnWhite: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { paddingHorizontal: 16, marginBottom: 8, fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  card: { backgroundColor: '#fff', padding: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontWeight: 'bold', color: '#1f2937' },
  cardSub: { fontSize: 14, color: '#6b7280' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeRed: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
  badgeTextGreen: { color: '#15803d' },
  badgeTextRed: { color: '#dc2626' },
  confianza: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 16 },
});
