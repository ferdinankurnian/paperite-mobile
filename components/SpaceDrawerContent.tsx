import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SPACES, type Space, type SpaceId } from '@/lib/paperite-data';
import { useSpace } from '@/lib/SpaceContext';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

type DrawerNav = {
  closeDrawer: () => void;
};

type Props = {
  navigation: DrawerNav;
};

function SpaceRow({
  space,
  active,
  onPress,
}: {
  space: Space;
  active: boolean;
  onPress: () => void;
}) {
  const { colors, isDarkColorScheme } = useColorScheme();
  const activeBackground = isDarkColorScheme ? colors.secondary : colors.muted;

  return (
    <View
      className="mx-2 mb-0.5 overflow-hidden rounded-xl"
      style={{
        backgroundColor: active ? activeBackground : 'transparent',
        borderWidth: 1,
        borderColor: active ? withOpacity(colors.foreground, 0.1) : 'transparent',
      }}>
      <Pressable
        onPress={onPress}
        className="flex-row items-center gap-3 px-3 py-2.5"
        android_ripple={{
          color: withOpacity(colors.foreground, 0.14),
          borderless: false,
        }}
        style={({ pressed }) => [pressed && { opacity: 0.78 }]}>
        <MaterialIcons
          name={(space.icon as IconName) || 'folder'}
          size={22}
          color={active ? colors.secondaryForeground : colors.foreground}
        />
        <PaperText
          variant="bodyLarge"
          style={{
            color: active ? colors.secondaryForeground : colors.foreground,
            fontWeight: active ? '600' : '400',
            flex: 1,
          }}
          numberOfLines={1}>
          {space.name}
        </PaperText>
      </Pressable>
    </View>
  );
}

export function SpaceDrawerContent({ navigation }: Props) {
  const { colors } = useColorScheme();
  const { activeSpaceId, setActiveSpaceId } = useSpace();
  const insets = useSafeAreaInsets();

  const systemTop = SPACES.filter((s) => s.id === 'inbox');
  const userSpaces = SPACES.filter((s) => s.kind === 'space');
  const systemBottom = SPACES.filter((s) => s.id === 'trash');

  function selectSpace(id: SpaceId) {
    setActiveSpaceId(id);
    navigation.closeDrawer();
  }

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 8,
      }}
      style={{ backgroundColor: colors.card }}>
      <View className="mb-4 px-4 pt-2">
        <PaperText
          variant="headlineSmall"
          style={{ color: colors.primary, fontFamily: 'Courgette_400Regular', marginLeft: 6, fontSize: 30 }}>
          Paperite
        </PaperText>
      </View>

      {systemTop.map((space) => (
        <SpaceRow
          key={space.id}
          space={space}
          active={activeSpaceId === space.id}
          onPress={() => selectSpace(space.id)}
        />
      ))}

      <View className="mx-4 my-2 h-px" style={{ backgroundColor: colors.border }} />

      {userSpaces.map((space) => (
        <SpaceRow
          key={space.id}
          space={space}
          active={activeSpaceId === space.id}
          onPress={() => selectSpace(space.id)}
        />
      ))}

      <View className="mx-2 mt-1 overflow-hidden rounded-xl">
        <Pressable
          onPress={() => {}}
          className="flex-row items-center gap-3 px-3 py-2.5"
          android_ripple={{
            color: withOpacity(colors.foreground, 0.14),
            borderless: false,
          }}
          style={({ pressed }) => [pressed && { opacity: 0.78 }]}>
          <MaterialIcons name="add" size={22} color={colors.mutedForeground} />
          <PaperText variant="bodyLarge" style={{ color: colors.mutedForeground }}>
            Add Space
          </PaperText>
        </Pressable>
      </View>

      <View className="flex-1" />

      <View className="mx-4 my-3 h-px" style={{ backgroundColor: colors.border }} />

      {systemBottom.map((space) => (
        <SpaceRow
          key={space.id}
          space={space}
          active={activeSpaceId === space.id}
          onPress={() => selectSpace(space.id)}
        />
      ))}

      <View className="mx-2 mb-4 overflow-hidden rounded-xl">
        <Pressable
          onPress={() => {
            navigation.closeDrawer();
            router.push('/modal');
          }}
          className="flex-row items-center gap-3 px-3 py-2.5"
          android_ripple={{
            color: withOpacity(colors.foreground, 0.14),
            borderless: false,
          }}
          style={({ pressed }) => [pressed && { opacity: 0.78 }]}>
          <MaterialIcons name="menu" size={22} color={colors.foreground} />
          <PaperText variant="bodyLarge" style={{ color: colors.foreground }}>
            Menu
          </PaperText>
        </Pressable>
      </View>
    </ScrollView>
  );
}
