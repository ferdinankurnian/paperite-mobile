import { MaterialSymbol } from './MaterialSymbol';
import type { ReactNode, Ref } from 'react';
import { useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  type PressableProps,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import {
  ToolbarMenuPopover,
  type ToolbarMenuEntry,
  type ToolbarMenuPopoverHandle,
} from './ToolbarMenu';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

/** ligature material symbols (underscore), mis. "more_vert", "undo", "format_bold". */
export type ToolbarIconName = string;

type ToolbarItemBaseProps = {
  accessibilityLabel: string;
  onPress?: () => void;
  disabled?: boolean;
  icon?: ToolbarIconName;
  children?: ReactNode;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
  hitSlop?: PressableProps['hitSlop'];
  testID?: string;
  /** diterusin ke slot luar — dibutuhin primitive (dropdown trigger) buat measure. */
  ref?: Ref<View>;
};

export type ToolbarItemProps = ToolbarItemBaseProps;

export type ToolbarAction = {
  icon: string;
  accessibilityLabel: string;
  onPress?: () => void;
  active?: boolean;
};

export type ToolbarMenu = {
  icon: string;
  accessibilityLabel?: string;
  entries: ToolbarMenuEntry[];
};

export type ToolbarGroupProps = {
  actions: ToolbarAction[];
  menu?: ToolbarMenu;
  accessibilityLabel?: string;
  disabled?: boolean;
  onZonePress?: (id: string) => void;
};

export const TOOLBAR_ITEM_SIZE = 48;

export function ToolbarItem({
  accessibilityLabel,
  onPress,
  disabled = false,
  icon,
  children,
  iconSize = 26,
  style,
  hitSlop = 8,
  testID,
  ref,
}: ToolbarItemProps) {
  const { colors } = useColorScheme();
  const size = TOOLBAR_ITEM_SIZE;
  const [holding, setHolding] = useState(false);
  // scale 1.08 pas ditahan — sama kayak Button icon-only (slot 48 bulet).
  // timing 120ms native driver, pola yang sama kayak Button.
  const [scale] = useState(() => new Animated.Value(1));
  const pressIn = () => {
    if (disabled) return;
    setHolding(true);
    Animated.timing(scale, { toValue: 1.08, duration: 120, useNativeDriver: true }).start();
  };
  const pressOut = () => {
    setHolding(false);
    Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }).start();
  };
  const isIconOnly = !children;

  return (
    <AnimatedPressable
      ref={ref}
      onPress={() => {
        pressOut();
        onPress?.();
      }}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{
        color: withOpacity(colors.foreground, 0.2),
        borderless: false,
        foreground: true,
      }}
      style={[
        styles.item,
        {
          minWidth: size,
          height: size,
          paddingHorizontal: isIconOnly ? 0 : 12,
          backgroundColor: colors.card,
          opacity: disabled ? 0.4 : pressedOpacity(disabled, holding),
          transform: [{ scale }],
        },
        style,
      ]}>
      {children ??
        (icon ? <MaterialSymbol name={icon} size={iconSize} color={colors.foreground} /> : null)}
      <View
        pointerEvents="none"
        style={[styles.borderOverlay, { borderColor: withOpacity(colors.border, 0.9) }]}
      />
    </AnimatedPressable>
  );
}

function pressedOpacity(disabled: boolean, holding: boolean) {
  if (disabled) return 0.4;
  // native ripple handles android feedback; ios has no ripple so fade instead
  if (Platform.OS === 'ios' && holding) return 0.7;
  return 1;
}

const styles = StyleSheet.create({
  item: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  borderOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    borderWidth: 1,
  },
});

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ToolbarGroup({
  actions,
  menu,
  accessibilityLabel = 'Actions',
  disabled = false,
  onZonePress,
}: ToolbarGroupProps) {
  const { colors } = useColorScheme();
  const size = TOOLBAR_ITEM_SIZE;
  const [holding, setHolding] = useState(false);
  const [scale] = useState(() => new Animated.Value(1));
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState<{
    pageX: number;
    pageY: number;
    width: number;
    height: number;
  } | null>(null);
  const groupRef = useRef<View>(null);
  const popoverRef = useRef<ToolbarMenuPopoverHandle>(null);

  const pressIn = () => {
    if (disabled) return;
    setHolding(true);
    Animated.timing(scale, { toValue: 1.06, duration: 120, useNativeDriver: true }).start();
  };
  const pressOut = () => {
    setHolding(false);
    Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }).start();
  };

  const zoneCount = actions.length + (menu ? 1 : 0);
  const fireZone = (index: number) => {
    if (index < actions.length) {
      const action = actions[index];
      onZonePress?.(action.accessibilityLabel);
      action.onPress?.();
      return;
    }
    if (menu) {
      onZonePress?.(menu.accessibilityLabel ?? 'More options');
      groupRef.current?.measureInWindow((pageX, pageY, width, height) => {
        setAnchor({ pageX, pageY, width, height });
        setMenuOpen(true);
      });
    }
  };
  const pressZone = (event: GestureResponderEvent) => {
    pressOut();
    if (disabled || zoneCount === 0) return;
    const index = Math.min(
      zoneCount - 1,
      Math.max(0, Math.floor(event.nativeEvent.locationX / size)),
    );
    fireZone(index);
  };

  return (
    <DropdownMenuPrimitive.Root
      onOpenChange={(open) => {
        if (!open) popoverRef.current?.dismiss();
      }}>
      <View ref={groupRef} collapsable={false}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Pressable
            onPress={pressZone}
            onPressIn={pressIn}
            onPressOut={pressOut}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            android_ripple={{
              color: withOpacity(colors.foreground, 0.14),
              borderless: false,
              foreground: true,
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              height: size,
              borderRadius: 999,
              backgroundColor: colors.card,
              overflow: 'hidden',
              opacity: disabled ? 0.4 : Platform.OS === 'ios' && holding ? 0.7 : 1,
            }}>
            {actions.map((action) => (
              <View
                key={action.accessibilityLabel}
                pointerEvents="none"
                style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                <View
                  pointerEvents="none"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: action.active
                      ? withOpacity(colors.primary, 0.12)
                      : 'transparent',
                  }}>
                  <MaterialSymbol name={action.icon} size={26} color={colors.foreground} />
                </View>
              </View>
            ))}
            {menu ? (
              <View
                pointerEvents="none"
                style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialSymbol name={menu.icon} size={26} color={colors.foreground} />
              </View>
            ) : null}
            <View
              pointerEvents="none"
              style={{
                ...StyleSheet.absoluteFillObject,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: withOpacity(colors.border, 0.9),
              }}
            />
          </Pressable>
        </Animated.View>
      </View>
      {menu && menuOpen && anchor ? (
        <ToolbarMenuPopover
          ref={popoverRef}
          anchor={anchor}
          origin="right"
          entries={menu.entries}
          onDismiss={() => setMenuOpen(false)}
        />
      ) : null}
    </DropdownMenuPrimitive.Root>
  );
}
