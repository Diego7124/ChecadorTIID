import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { registrarUsuario } from '../../services/api';

const TOTAL_FOTOS = 5;

export default function RegistrarUsuarioScreen() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [area, setArea] = useState('');
  const [fotosBase64, setFotosBase64] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const cameraRef = useRef<any>(null);

  const capturarRostro = async () => {
    if (!permission?.granted) { await requestPermission(); return; }
    setFotosBase64([]);
    setCurrentPhoto(0);
    setShowCamera(true);
  };

  const takePicture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);

    let count = 3;
    setCountdown(count);
    const timer = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        doCapture();
      }
    }, 1000);
  };

  const doCapture = async () => {
    if (!cameraRef.current) { setCapturing(false); return; }
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      let b64 = photo.base64;
      if (!b64) {
        b64 = await FileSystem.readAsStringAsync(photo.uri, { encoding: 'base64' });
      }

      const newPhotos = [...fotosBase64, b64];
      setFotosBase64(newPhotos);

      if (newPhotos.length >= TOTAL_FOTOS) {
        setShowCamera(false);
        Alert.alert('Listo', `${TOTAL_FOTOS} fotos capturadas correctamente`);
      } else {
        setCurrentPhoto(newPhotos.length);
        Alert.alert('Foto ' + newPhotos.length, `Faltan ${TOTAL_FOTOS - newPhotos.length} fotos. Mueve la cabeza un poco y vuelve a capturar.`);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo capturar la imagen');
    } finally {
      setCapturing(false);
    }
  };

  const handleRegistrar = async () => {
    if (!nombre || !email || !password) { Alert.alert('Error', 'Nombre, email y contraseña son obligatorios'); return; }
    if (fotosBase64.length === 0) { Alert.alert('Error', 'Captura al menos 1 foto del rostro'); return; }
    setLoading(true);
    try {
      await registrarUsuario({
        nombre, email, password, rol: 'usuario', area,
        imagenes_base64: JSON.stringify(fotosBase64),
      });
      Alert.alert('Éxito', 'Usuario registrado correctamente');
      setNombre(''); setEmail(''); setPassword(''); setArea(''); setFotosBase64([]);
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'No se pudo registrar'); }
    finally { setLoading(false); }
  };

  if (showCamera) {
    return (
      <View style={s.black}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />

        <View style={s.guideOverlay}>
          <View style={s.guideHeader}>
            <Text style={s.guideTitle}>Foto {currentPhoto + 1} de {TOTAL_FOTOS}</Text>
            <Text style={s.guideSub}>Coloca tu rostro dentro del óvalo</Text>
          </View>

          <View style={s.ovalContainer}>
            <View style={s.oval} />
          </View>

          <View style={s.guideTips}>
            <Text style={s.tipText}>• Mira directamente a la cámara</Text>
            <Text style={s.tipText}>• Buena iluminación</Text>
            <Text style={s.tipText}>• Sin gafas ni cubrebocas</Text>
          </View>

          <View style={s.progressDots}>
            {Array.from({ length: TOTAL_FOTOS }).map((_, i) => (
              <View key={i} style={[s.dot, i < fotosBase64.length && s.dotDone]} />
            ))}
          </View>

          {countdown > 0 ? (
            <View style={s.countdownContainer}>
              <Text style={s.countdownText}>{countdown}</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={takePicture} style={s.captureBtn} disabled={capturing}>
              <Text style={s.captureBtnText}>{capturing ? 'Procesando...' : 'Capturar'}</Text>
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
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={s.title}>Registrar Nuevo Usuario</Text>
      <View style={s.formCard}>
        <TextInput style={s.input} placeholder="Nombre completo" value={nombre} onChangeText={setNombre} />
        <TextInput style={s.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={s.input} placeholder="Contraseña" value={password} onChangeText={setPassword} secureTextEntry />
        <TextInput style={s.input} placeholder="Área (ej: RH, Sistemas)" value={area} onChangeText={setArea} />

        <TouchableOpacity onPress={capturarRostro} style={[s.captureFaceBtn, fotosBase64.length > 0 && s.captureFaceBtnDone]}>
          <Text style={s.captureFaceText}>
            {fotosBase64.length > 0
              ? `✓ ${fotosBase64.length}/${TOTAL_FOTOS} fotos capturadas`
              : `Capturar Rostro (${TOTAL_FOTOS} fotos)`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRegistrar} style={[s.registerBtn, loading && s.registerBtnDisabled]} disabled={loading}>
          <Text style={s.registerBtnText}>{loading ? 'Registrando...' : 'Registrar Usuario'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  guideOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  guideHeader: { alignItems: 'center' },
  guideTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  guideSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
  ovalContainer: { alignItems: 'center', justifyContent: 'center' },
  oval: { width: 200, height: 260, borderWidth: 3, borderColor: '#22c55e', borderRadius: 100, borderStyle: 'dashed' },
  guideTips: { alignItems: 'flex-start' },
  tipText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 2 },
  progressDots: { flexDirection: 'row', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotDone: { backgroundColor: '#22c55e' },
  countdownContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  countdownText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  captureBtn: { backgroundColor: '#fff', paddingHorizontal: 48, paddingVertical: 18, borderRadius: 999 },
  captureBtnText: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  cancelBtnArea: { paddingVertical: 8 },
  cancelText: { color: 'rgba(255,255,255,0.7)', fontSize: 16 },
  screen: { flex: 1, backgroundColor: '#f3f4f6' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: 24, gap: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', padding: 12, borderRadius: 8, fontSize: 16 },
  captureFaceBtn: { backgroundColor: '#6b7280', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  captureFaceBtnDone: { backgroundColor: '#22c55e' },
  captureFaceText: { color: '#fff', fontWeight: 'bold' },
  registerBtn: { backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  registerBtnDisabled: { backgroundColor: '#9ca3af' },
  registerBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});
