import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

import { EditScreenInfo } from './EditScreenInfo';

interface ScreenContentProps {
  title: string;
  path: string;
  children?: React.ReactNode;
}

export const ScreenContent: React.FC<ScreenContentProps> = ({ title, path, children }) => {
  return (
    <View style={s.container}>
      <Text style={s.title}>{title}</Text>
      <View style={s.separator} />
      <EditScreenInfo path={path} />
      {children}
    </View>
  );
};

const s = StyleSheet.create({
  container: { alignItems: 'center', flex: 1, justifyContent: 'center', backgroundColor: '#fff' },
  separator: { height: 1, marginVertical: 28, width: '80%', backgroundColor: '#e5e7eb' },
  title: { fontSize: 20, fontWeight: 'bold' },
});
