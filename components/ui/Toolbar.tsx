import { MaterialSymbol } from './MaterialSymbol';
import type { ReactNode, Ref } from 'react';
import { Fragment, useState } from 'react';
import {
  Platform,
  Pressable,
  type PressableProps,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

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

export type ToolbarItemProps = ToolbarItemBaseProps & {
  /** Inside a ToolbarItemGroup the slot shares the group surface: no own border/shadow. */
  grouped?: boolean;
};

export type ToolbarAction = Omit<ToolbarItemProps, 'grouped' | 'style'>;

export const TOOLBAR_ITEM_SIZE = 48;

export function ToolbarItem({
  accessibilityLabel,
  onPress,
  disabled = false,
  icon,
  children,
  iconSize = 26,
  grouped = false,
  style,
  hitSlop = 8,
  testID,
  ref,
}: ToolbarItemProps) {
  const { colors } = useColorScheme();
  const size = TOOLBAR_ITEM_SIZE;
  const [holding, setHolding] = useState(false);
  const userStyle = StyleSheet.flatten(style) ?? {};
  const slotBg = grouped ? 'transparent' : colors.card;

  return (
    <View
      ref={ref}
      style={[
        styles.slot,
        grouped ? styles.groupedSlot : styles.singleSlot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: slotBg,
          borderColor: grouped ? 'transparent' : withOpacity(colors.border, 0.9),
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}>
      <Pressable
        onPress={() => {
          setHolding(false);
          onPress?.();
        }}
        onPressIn={() => setHolding(true)}
        onPressOut={() => setHolding(false)}
        disabled={disabled}
        hitSlop={hitSlop}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        android_ripple={{
          color: withOpacity(colors.foreground, 0.2),
          borderless: false,
          foreground: true,
          radius: size / 2,
        }}
        style={[
          styles.pressable,
          {
            borderRadius: size / 2,
            backgroundColor: slotBg,
            opacity: pressedOpacity(disabled, holding),
          },
          userStyle,
        ]}>
        {children ??
          (icon ? <MaterialSymbol name={icon} size={iconSize} color={colors.foreground} /> : null)}
      </Pressable>
    </View>
  );
}

function pressedOpacity(disabled: boolean, holding: boolean) {
  if (disabled) return 0.4;
  // native ripple handles android feedback; ios has no ripple so fade instead
  if (Platform.OS === 'ios' && holding) return 0.7;
  return 1;
}

export type ToolbarItemGroupProps = {
  actions: ToolbarAction[];
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** Container pill generik — buat grup campuran (mis. ToolbarItem + ToolbarMenu trigger). */
export function ToolbarGroup({
  children,
  style,
  accessibilityLabel = 'Actions',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { colors } = useColorScheme();

  return (
    <View
      accessibilityRole="toolbar"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.group,
        {
          backgroundColor: colors.card,
          borderColor: withOpacity(colors.border, 0.9),
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function ToolbarSeparator() {
  const { colors } = useColorScheme();
  return <View style={[styles.separator, { backgroundColor: withOpacity(colors.border, 0.9) }]} />;
}

export function ToolbarItemGroup({
  actions,
  style,
  accessibilityLabel = 'Actions',
}: ToolbarItemGroupProps) {
  return (
    <ToolbarGroup style={style} accessibilityLabel={accessibilityLabel}>
      {actions.map((action, index) => (
        <Fragment key={action.testID ?? action.accessibilityLabel}>
          <ToolbarItem {...action} grouped hitSlop={4} />
          {index < actions.length - 1 ? <ToolbarSeparator /> : null}
        </Fragment>
      ))}
    </ToolbarGroup>
  );
}

const styles = StyleSheet.create({
  slot: {
    flexGrow: 0,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  singleSlot: {
    borderWidth: 1,
  },
  groupedSlot: {
    borderWidth: 0,
  },
  pressable: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TOOLBAR_ITEM_SIZE,
    flexShrink: 0,
    borderRadius: TOOLBAR_ITEM_SIZE / 2,
    borderWidth: 1,
    overflow: 'hidden',
  },
  separator: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    flexShrink: 0,
  },
});
