import { Tabs, Redirect } from 'expo-router';
import { Text } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function AdminLayout() {
  const { usuario } = useAuthStore();

  if (!usuario) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        headerStyle: { backgroundColor: '#2563eb' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Tabs.Screen
        name="usuarios"
        options={{
          title: 'Usuarios',
          headerTitle: 'Gestión de Usuarios',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👥</Text>,
        }}
      />
      <Tabs.Screen
        name="asistencia"
        options={{
          title: 'Asistencia',
          headerTitle: 'Control de Asistencia',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="horarios"
        options={{
          title: 'Horarios',
          headerTitle: 'Gestión de Horarios',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🕐</Text>,
        }}
      />
      <Tabs.Screen
        name="vacaciones"
        options={{
          title: 'Permisos',
          headerTitle: 'Historial de Permisos',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📅</Text>,
        }}
      />
      <Tabs.Screen
        name="registrar-usuario"
        options={{
          title: 'Registrar',
          headerTitle: 'Registrar Usuario',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>➕</Text>,
        }}
      />
      <Tabs.Screen
        name="historial-usuario"
        options={{
          title: 'Hist. Usuario',
          headerTitle: 'Historial de Usuario',
          href: null,
        }}
      />
      <Tabs.Screen
        name="historial-area"
        options={{
          title: 'Hist. Área',
          headerTitle: 'Historial por Área',
          href: null,
        }}
      />
    </Tabs>
  );
}
