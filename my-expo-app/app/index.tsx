import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { login, loginFacial, setAuthToken } from '../services/api';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');

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
            <Text style={s.guideSub}>Coloca tu rostro dentro del ovalo</Text>
          </View>

          <View style={s.ovalContainer}>
            <View style={s.ovalOuter}>
              <View style={s.ovalInner} />
            </View>
          </View>

          {countdown > 0 ? (
            <View style={s.countdownContainer}>
              <Text style={s.countdownText}>{countdown}</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={captureAndLogin} style={s.captureBtn} disabled={loading} activeOpacity={0.8}>
              <View style={s.captureBtnInner}>
                <Text style={s.captureBtnIcon}>📷</Text>
                <Text style={s.captureBtnText}>{loading ? 'Procesando...' : 'Capturar y Validar'}</Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => setShowCamera(false)} style={s.cancelBtnArea} activeOpacity={0.7}>
            <Text style={s.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.bgCircle1} />
      <View style={s.bgCircle2} />
      <View style={s.bgCircle3} />

      <View style={s.content}>
        <View style={s.logoArea}>
          <View style={s.logoCircle}>
            <Text style={s.logoIcon}>🔐</Text>
          </View>
          <Text style={s.title}>ChecadorTIID</Text>
          <Text style={s.subtitle}>Control de Asistencia Inteligente</Text>
        </View>

        <View style={s.formCard}>
          <Text style={s.formTitle}>Iniciar Sesion</Text>

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Correo Electronico</Text>
            <View style={s.inputWrapper}>
              <Text style={s.inputIcon}>✉️</Text>
              <TextInput
                style={s.input}
                placeholder="tu@email.com"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Contrasena</Text>
            <View style={s.inputWrapper}>
              <Text style={s.inputIcon}>🔒</Text>
              <TextInput
                style={s.input}
                placeholder="Tu contrasena"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity onPress={handleLogin} style={s.loginBtn} disabled={loading} activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.loginBtnText}>Iniciar Sesion</Text>
            )}
          </TouchableOpacity>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>O</Text>
            <View style={s.dividerLine} />
          </View>

          <TouchableOpacity onPress={handleFacialLogin} style={s.facialBtn} activeOpacity={0.8}>
            <Text style={s.facialBtnIcon}>👤</Text>
            <Text style={s.facialBtnText}>Reconocimiento Facial</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>ChecadorTIID v1.0</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  bgCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    top: -80,
    right: -60,
  },
  bgCircle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    bottom: 100,
    left: -80,
  },
  bgCircle3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    bottom: -40,
    right: -40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 36,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  formCard: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.4)',
    paddingHorizontal: 14,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f1f5f9',
  },
  loginBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(71, 85, 105, 0.4)',
  },
  dividerText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: 14,
  },
  facialBtn: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  facialBtnIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  facialBtnText: {
    color: '#93c5fd',
    fontWeight: '700',
    fontSize: 15,
  },
  footer: {
    color: '#475569',
    fontSize: 12,
    marginTop: 32,
    letterSpacing: 0.3,
  },

  // Camera styles
  black: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  topInfo: { alignItems: 'center' },
  guideTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  guideSub: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 6 },
  ovalContainer: { alignItems: 'center', justifyContent: 'center' },
  ovalOuter: {
    width: 220,
    height: 280,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ovalInner: {
    width: 200,
    height: 260,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#22c55e',
    borderStyle: 'dashed',
  },
  countdownContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
  captureBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captureBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  captureBtnIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  captureBtnText: { fontSize: 17, fontWeight: 'bold', color: '#000' },
  cancelBtnArea: { paddingVertical: 12 },
  cancelText: { color: 'rgba(255,255,255,0.6)', fontSize: 16 },
});
