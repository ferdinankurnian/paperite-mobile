import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ColorValue, StyleSheet } from 'react-native';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

export const TabBarIcon = ({
  name,
  color,
  size = 24,
}: {
  name: MaterialIconName;
  color: ColorValue;
  size?: number;
}) => {
  return <MaterialIcons name={name} size={size} color={color} style={styles.tabBarIcon} />;
};

const styles = StyleSheet.create({
  tabBarIcon: {
    marginBottom: -3,
  },
});
