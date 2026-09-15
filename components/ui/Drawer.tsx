import {
  BottomSheetBackdrop,
  BottomSheetModal,
  type BottomSheetBackdropProps,
  type BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import * as React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { useColorScheme } from '@/lib/useColorScheme';

/**
 * drawer standar — reunite 3 copy bottom sheet gorhom:
 * CreateSpaceSheet (94%) + FolderNameSheet (40%) + MoveSheet (60%).
 * yang distandardize: backdrop 0.4, r28, bg card, handle null.
 * yang bebas: snap + isi + keyboard/footer behavior.
 */
export const DRAWER_RADIUS = 28;

export function DrawerBackdrop(props: BottomSheetBackdropProps) {
  return <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />;
}

export type DrawerProps = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  /** snap height, mis. ['60%']. default ['60%'] ala MoveSheet. */
  snapPoints?: (string | number)[];
  /** dipanggil pas drawer kebuka (index >= 0) — buat lazy mount / load data. */
  onOpen?: () => void;
  onClose?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
} & Omit<
  Partial<BottomSheetModalProps>,
  'ref' | 'snapPoints' | 'children' | 'backdropComponent' | 'handleComponent' | 'onChange' | 'style'
>;

export function Drawer({
  sheetRef,
  snapPoints = ['60%'],
  onOpen,
  onClose,
  children,
  backgroundStyle,
  style,
  enablePanDownToClose = true,
  ...rest
}: DrawerProps & { backgroundStyle?: StyleProp<ViewStyle> }) {
  const { colors } = useColorScheme();

  const handleChange = React.useCallback(
    (index: number) => {
      if (index >= 0) onOpen?.();
      else onClose?.();
    },
    [onOpen, onClose]
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose={enablePanDownToClose}
      backdropComponent={DrawerBackdrop}
      handleComponent={null}
      onChange={handleChange}
      backgroundStyle={[{ backgroundColor: colors.card }, backgroundStyle]}
      style={[
        {
          overflow: 'hidden',
          borderTopLeftRadius: DRAWER_RADIUS,
          borderTopRightRadius: DRAWER_RADIUS,
        },
        style,
      ]}
      {...rest}>
      {children}
    </BottomSheetModal>
  );
}
