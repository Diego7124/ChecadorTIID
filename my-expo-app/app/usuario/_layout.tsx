import { Tabs, Redirect } from 'expo-router';
import { Text } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function UsuarioLayout() {
  const { usuario } = useAuthStore();

  if (!usuario) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#6b7280',
        headerStyle: { backgroundColor: '#16a34a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Tabs.Screen
        name="checar"
        options={{
          title: 'Checar',
          headerTitle: 'Mi Asistencia',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📷</Text>,
        }}
      />
      <Tabs.Screen
        name="historial"
        options={{
          title: 'Historial',
          headerTitle: 'Mi Historial',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="permisos"
        options={{
          title: 'Permisos',
          headerTitle: 'Mis Permisos',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📝</Text>,
        }}
      />
    </Tabs>
  );
}
