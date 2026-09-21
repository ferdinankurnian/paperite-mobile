import { MaterialSymbol } from '@/components/ui/MaterialSymbol';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { router, usePathname } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Space, type SpaceId } from '@/lib/paperite-data';
import { useSpace } from '@/lib/SpaceContext';
import { SpaceIcon } from '@/lib/space-icons';
import { INBOX_ID, TRASH_ID } from '@/lib/storage/files';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';
import { CreateSpaceSheet } from './CreateSpaceSheet';

type SidebarNav = {
  closeDrawer: () => void;
};

type Props = {
  navigation: SidebarNav;
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
  // drawer abu di light mode (match drawerStyle) — active row jadi putih biar keliatan.
  // dark mode drawer = card, active = secondary (udah kontras).
  const activeBackground = isDarkColorScheme ? colors.secondary : colors.card;
  const tint = space.color ?? (active ? colors.secondaryForeground : colors.foreground);

  return (
    <View
      className="mx-2 mb-0.5 overflow-hidden rounded-full"
      style={{
        backgroundColor: active ? activeBackground : 'transparent',
        borderWidth: 1,
        borderColor: active ? withOpacity(colors.foreground, 0.1) : 'transparent',
        borderRadius: 999,
      }}>
      <Pressable
        onPress={onPress}
        className="flex-row items-center gap-3 rounded-full px-3 py-2.5"
        android_ripple={{
          color: withOpacity(colors.foreground, 0.14),
          borderless: false,
        }}
        style={({ pressed }) => [pressed && { opacity: 0.78 }]}>
        <SpaceIcon name={space.icon || 'folder'} size={22} color={tint} />
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

export function AppSidebar({ navigation }: Props) {
  const { colors, isDarkColorScheme } = useColorScheme();
  const { activeSpaceId, setActiveSpaceId, spaces } = useSpace();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const sheetRef = React.useRef<BottomSheetModal>(null);

  const systemTop = spaces.filter((s) => s.id === INBOX_ID);
  const userSpaces = spaces.filter((s) => s.kind === 'space');
  const systemBottom = spaces.filter((s) => s.id === TRASH_ID);

  function selectSpace(id: SpaceId) {
    setActiveSpaceId(id);
    // kalo lagi di settings (list maupun detail), balik dulu ke note list biar space-nya keliatan
    if (pathname === '/settings' || pathname.startsWith('/settings/')) {
      router.replace('/');
    }
    navigation.closeDrawer();
  }

  const onSettings = pathname === '/settings' || pathname.startsWith('/settings/');
  // lagi di settings: space rows jangan active biar ga double highlight
  const isSpaceActive = (id: SpaceId) => !onSettings && activeSpaceId === id;
  // drawer abu di light (lihat wrapper di drawerContent) — active row putih biar kontras
  const activeBg = isDarkColorScheme ? colors.secondary : colors.card;

  return (
    <>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
        }}
        // transparan: yang ngecat abu + rounded itu wrapper di drawerContent
        // (bg + radius di view yang sama selalu kepotong bener, tanpa butuh
        // overflow hidden yang gagal di android karena transform drawer).
        // kalau ScrollView opaque di sini, rect kotaknya nutupin corner.
        style={{ backgroundColor: 'transparent' }}>
        <View className="mb-4 px-4 pt-2">
          <PaperText
            variant="headlineSmall"
            style={{
              color: colors.primary,
              fontFamily: 'Courgette_400Regular',
              marginLeft: 6,
              fontSize: 30,
            }}>
            Paperite
          </PaperText>
        </View>

        {systemTop.map((space) => (
          <SpaceRow
            key={space.id}
            space={space}
            active={isSpaceActive(space.id)}
            onPress={() => selectSpace(space.id)}
          />
        ))}

        <View className="mx-4 my-2 h-px" style={{ backgroundColor: colors.border }} />

        {userSpaces.map((space) => (
          <SpaceRow
            key={space.id}
            space={space}
            active={isSpaceActive(space.id)}
            onPress={() => selectSpace(space.id)}
          />
        ))}

        <View className="mx-2 mt-1 overflow-hidden rounded-full">
          <Pressable
            onPress={() => sheetRef.current?.present()}
            className="flex-row items-center gap-3 rounded-full px-3 py-2.5"
            android_ripple={{
              color: withOpacity(colors.foreground, 0.14),
              borderless: false,
            }}
            style={({ pressed }) => [pressed && { opacity: 0.78 }]}>
            <MaterialSymbol name="add" size={26} color={colors.mutedForeground} />
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
            active={isSpaceActive(space.id)}
            onPress={() => selectSpace(space.id)}
          />
        ))}

        <View
          className="mx-2 mb-4 overflow-hidden rounded-full"
          style={{
            backgroundColor: onSettings ? activeBg : 'transparent',
            borderWidth: 1,
            borderColor: onSettings ? withOpacity(colors.foreground, 0.1) : 'transparent',
            borderRadius: 999,
          }}>
          <Pressable
            onPress={() => {
              navigation.closeDrawer();
              router.push('/settings');
            }}
            className="flex-row items-center gap-3 rounded-full px-3 py-2.5"
            android_ripple={{
              color: withOpacity(colors.foreground, 0.14),
              borderless: false,
            }}
            style={({ pressed }) => [pressed && { opacity: 0.78 }]}>
            <MaterialSymbol
              name="settings"
              size={26}
              color={onSettings ? colors.secondaryForeground : colors.foreground}
            />
            <PaperText
              variant="bodyLarge"
              style={{
                color: onSettings ? colors.secondaryForeground : colors.foreground,
                fontWeight: onSettings ? '600' : '400',
              }}>
              Settings
            </PaperText>
          </Pressable>
        </View>
      </ScrollView>
      <CreateSpaceSheet sheetRef={sheetRef} onCreated={() => navigation.closeDrawer()} />
    </>
  );
}
