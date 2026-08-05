import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { registrarAsistencia } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function ChecarScreen() {
  const [showCamera, setShowCamera] = useState(false);
  const [tipo, setTipo] = useState<'entrada' | 'salida'>('entrada');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const { usuario } = useAuthStore();

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
          Alert.alert('Éxito', `${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada correctamente`);
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

  return (
    <View style={s.screen}>
      <View style={s.card}>
        <Text style={s.greeting}>Hola, {usuario?.nombre}</Text>
        <Text style={s.greetingSub}>Presiona el botón para checar tu asistencia</Text>

        <TouchableOpacity onPress={() => abrirCamara('entrada')} style={s.entradaBtn} disabled={loading}>
          <Text style={s.btnWhite}>Registrar Entrada</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => abrirCamara('salida')} style={s.salidaBtn} disabled={loading}>
          <Text style={s.btnWhite}>Registrar Salida</Text>
        </TouchableOpacity>
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
  screen: { flex: 1, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 32, width: '100%', alignItems: 'center' },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  greetingSub: { color: '#6b7280', marginBottom: 32, textAlign: 'center' },
  entradaBtn: { width: '100%', backgroundColor: '#22c55e', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  salidaBtn: { width: '100%', backgroundColor: '#ef4444', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnWhite: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});
