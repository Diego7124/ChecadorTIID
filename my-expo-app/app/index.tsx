import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { login, loginFacial, setAuthToken } from '../services/api';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const router = useRouter();
  const { login: storeLogin } = useAuthStore();

  const [countdown, setCountdown] = useState(0);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Ingresa email y contraseña');
      return;
    }
    setLoading(true);
    try {
      const res = await login(email, password);
      storeLogin(res.data.usuario, res.data.token);
      setAuthToken(res.data.token);
      if (res.data.usuario.rol === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/usuario');
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  const handleFacialLogin = async () => {
    if (!permission?.granted) {
      await requestPermission();
      return;
    }
    setShowCamera(true);
  };

  const captureAndLogin = async () => {
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
          const res = await loginFacial(b64);
          storeLogin(res.data.usuario, res.data.token);
          setAuthToken(res.data.token);
          if (res.data.usuario.rol === 'admin') {
            router.replace('/admin');
          } else {
            router.replace('/usuario');
          }
        } catch (e: any) {
          Alert.alert('Error', e.response?.data?.detail || e.message || 'Rostro no reconocido');
        } finally {
          setLoading(false);
        }
      }
    }, 1000);
  };

  if (showCamera) {
    return (
      <View style={s.black}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />
        <View style={s.cameraOverlay}>
          <View style={s.topInfo}>
            <Text style={s.guideTitle}>Reconocimiento Facial</Text>
            <Text style={s.guideSub}>Coloca tu rostro en el óvalo</Text>
          </View>

          <View style={s.ovalContainer}>
            <View style={s.oval} />
          </View>

          {countdown > 0 ? (
            <View style={s.countdownContainer}>
              <Text style={s.countdownText}>{countdown}</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={captureAndLogin} style={s.captureBtn} disabled={loading}>
              <Text style={s.captureBtnText}>{loading ? 'Procesando...' : 'Capturar y Validar'}</Text>
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
    <View style={s.container}>
      <Text style={s.title}>ChecadorTIID</Text>
      <Text style={s.subtitle}>Reconocimiento Facial</Text>

      <View style={s.form}>
        <TextInput
          style={s.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={s.input}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity onPress={handleLogin} style={s.loginBtn} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#2563eb" />
          ) : (
            <Text style={s.loginBtnText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleFacialLogin} style={s.facialBtn}>
          <Text style={s.facialBtnText}>Reconocimiento Facial</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  topInfo: { alignItems: 'center' },
  guideTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  guideSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
  ovalContainer: { alignItems: 'center', justifyContent: 'center' },
  oval: { width: 200, height: 260, borderWidth: 3, borderColor: '#22c55e', borderRadius: 100, borderStyle: 'dashed' },
  countdownContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  countdownText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  captureBtn: { backgroundColor: '#fff', paddingHorizontal: 48, paddingVertical: 18, borderRadius: 999 },
  captureBtnText: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  cancelBtnArea: { paddingVertical: 8 },
  cancelText: { color: 'rgba(255,255,255,0.7)', fontSize: 16 },
  container: { flex: 1, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { color: 'rgba(255,255,255,0.8)', marginBottom: 32 },
  form: { width: '100%', gap: 16 },
  input: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, fontSize: 16 },
  loginBtn: { backgroundColor: '#fff', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  loginBtnText: { color: '#2563eb', fontWeight: 'bold', fontSize: 18 },
  facialBtn: { backgroundColor: '#3b82f6', borderWidth: 2, borderColor: '#fff', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  facialBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});
