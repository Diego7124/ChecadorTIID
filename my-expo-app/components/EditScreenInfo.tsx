import { Text, View, StyleSheet } from 'react-native';

interface EditScreenInfoProps {
  path: string;
}

export const EditScreenInfo: React.FC<EditScreenInfoProps> = ({ path }) => {
  const title = 'Open up the code for this screen:';
  const description =
    'Change any of the text, save the file, and your app will automatically update.';

  return (
    <View style={s.container}>
      <View style={s.getStartedContainer}>
        <Text style={s.getStartedText}>{title}</Text>
        <View style={s.codeHighlightContainer}>
          <Text>{path}</Text>
        </View>
        <Text style={s.getStartedText}>{description}</Text>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: { width: '100%' },
  codeHighlightContainer: { borderRadius: 6, paddingHorizontal: 4 },
  getStartedContainer: { alignItems: 'center', marginHorizontal: 48 },
  getStartedText: { fontSize: 18, lineHeight: 24, textAlign: 'center' },
});
