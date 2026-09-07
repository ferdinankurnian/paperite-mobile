import { Link } from 'expo-router';
import { Stack as JsStack } from 'expo-router/js-stack';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/lib/useColorScheme';

export default function NotFoundScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useColorScheme();

  return (
    <>
      <JsStack.Screen options={{ title: 'Oops!' }} />
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: 24,
          paddingRight: 24,
          backgroundColor: colors.background,
        }}>
        <Text className={styles.title}>{"This screen doesn't exist."}</Text>
        <Link href="/" className={styles.link}>
          <Text className={styles.linkText}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = {
  title: `text-xl font-bold`,
  link: `mt-4 pt-4`,
  linkText: `text-base text-[#2e78b7]`,
};
