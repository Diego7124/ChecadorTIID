import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect } from '@react-navigation/native';
import { registrarAsistencia, estadoHoy } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface EstadoDia {
  horario_nombre: string;
  hora_entrada: string;
  hora_salida: string;
  tolerancia_min: number;
  registro_entrada: string;
  registro_salida: string;
  retraso_min: number;
  tiene_retardo: boolean;
}

export default function ChecarScreen() {
  const [showCamera, setShowCamera] = useState(false);
  const [tipo, setTipo] = useState<'entrada' | 'salida'>('entrada');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const { usuario } = useAuthStore();
  const [estado, setEstado] = useState<EstadoDia | null>(null);

  const cargarEstado = async () => {
    if (!usuario) return;
    try {
      const res = await estadoHoy(usuario.id);
      setEstado(res.data);
    } catch { }
  };

  useFocusEffect(
    useCallback(() => {
      cargarEstado();
    }, [])
  );

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
          Alert.alert('Exito', `${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada correctamente`);
          cargarEstado();
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
            <Text style={s.overlaySub}>Coloca tu rostro en el ovalo</Text>
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
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={s.captureBtnText}>Capturar</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => setShowCamera(false)} style={s.cancelBtnArea}>
            <Text style={s.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const yaChecoEntrada = !!estado?.registro_entrada;
  const yaChecoSalida = !!estado?.registro_salida;

  return (
    <View style={s.screen}>
      <View style={s.card}>
        <Text style={s.greeting}>Hola, {usuario?.nombre}</Text>

        {estado?.horario_nombre ? (
          <View style={s.scheduleBox}>
            <Text style={s.scheduleLabel}>Tu horario</Text>
            <Text style={s.scheduleName}>{estado.horario_nombre}</Text>
            <View style={s.scheduleRow}>
              <View style={s.scheduleItem}>
                <Text style={s.scheduleTime}>{estado.hora_entrada}</Text>
                <Text style={s.scheduleDesc}>Entrada</Text>
              </View>
              <View style={s.scheduleDivider} />
              <View style={s.scheduleItem}>
                <Text style={s.scheduleTime}>{estado.hora_salida}</Text>
                <Text style={s.scheduleDesc}>Salida</Text>
              </View>
            </View>
            <Text style={s.toleranceText}>Tolerancia: {estado.tolerancia_min} min</Text>
          </View>
        ) : (
          <View style={s.scheduleBox}>
            <Text style={s.scheduleLabel}>Sin horario asignado</Text>
            <Text style={s.noSchedule}>Contacta al administrador</Text>
          </View>
        )}

        {yaChecoEntrada && (
          <View style={s.statusBox}>
            <View style={s.statusRow}>
              <Text style={s.statusIcon}>✅</Text>
              <View>
                <Text style={s.statusTitle}>Entrada registrada</Text>
                <Text style={s.statusTime}>{estado?.registro_entrada}</Text>
              </View>
            </View>
            {estado?.tiene_retardo && (
              <View style={s.delayBadge}>
                <Text style={s.delayText}>Retardo: {estado.retraso_min} min</Text>
              </View>
            )}
          </View>
        )}

        {yaChecoSalida && (
          <View style={s.statusBox}>
            <View style={s.statusRow}>
              <Text style={s.statusIcon}>✅</Text>
              <View>
                <Text style={s.statusTitle}>Salida registrada</Text>
                <Text style={s.statusTime}>{estado?.registro_salida}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={s.buttonsContainer}>
          <TouchableOpacity
            onPress={() => abrirCamara('entrada')}
            style={[s.entradaBtn, yaChecoEntrada && s.btnDisabled]}
            disabled={loading || yaChecoEntrada}
          >
            <Text style={s.btnIcon}>📥</Text>
            <Text style={s.btnWhite}>Registrar Entrada</Text>
            {yaChecoEntrada && <Text style={s.btnDone}>Ya checaste</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => abrirCamara('salida')}
            style={[s.salidaBtn, (!yaChecoEntrada || yaChecoSalida) && s.btnDisabled]}
            disabled={loading || !yaChecoEntrada || yaChecoSalida}
          >
            <Text style={s.btnIcon}>📤</Text>
            <Text style={s.btnWhite}>Registrar Salida</Text>
            {!yaChecoEntrada && <Text style={s.btnDone}>Primero checa entrada</Text>}
            {yaChecoSalida && <Text style={s.btnDone}>Ya checaste</Text>}
          </TouchableOpacity>
        </View>
      </View>
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
  screen: { flex: 1, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', alignItems: 'center' },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },

  scheduleBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scheduleLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  scheduleName: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginTop: 4, marginBottom: 12 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  scheduleItem: { alignItems: 'center' },
  scheduleTime: { fontSize: 22, fontWeight: '800', color: '#16a34a' },
  scheduleDesc: { fontSize: 13, color: '#64748b', marginTop: 2 },
  scheduleDivider: { width: 1, height: 30, backgroundColor: '#e2e8f0' },
  toleranceText: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 10 },
  noSchedule: { fontSize: 14, color: '#94a3b8', marginTop: 4 },

  statusBox: {
    width: '100%',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusIcon: { fontSize: 20 },
  statusTitle: { fontSize: 14, fontWeight: '600', color: '#166534' },
  statusTime: { fontSize: 13, color: '#16a34a', fontWeight: '700' },
  delayBadge: {
    marginTop: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  delayText: { fontSize: 13, fontWeight: '600', color: '#b45309' },

  buttonsContainer: { width: '100%', gap: 12, marginTop: 8 },
  entradaBtn: {
    width: '100%',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  salidaBtn: {
    width: '100%',
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnIcon: { fontSize: 18 },
  btnWhite: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
  btnDone: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
});
