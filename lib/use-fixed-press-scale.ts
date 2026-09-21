import { useCallback, useRef, useState } from 'react';
import { Animated, type LayoutChangeEvent } from 'react-native';

/**
 * Press scale yang konsisten secara visual, bukan cuma secara rasio.
 *
 * Scale 1.08 dipakai sebagai baseline untuk control 48dp. Untuk control yang
 * lebih lebar/sempit, scale X/Y dihitung dari delta pixel yang sama supaya
 * pill besar tidak bergerak lebih jauh daripada icon button kecil.
 */
const BASE_SCALE = 1.08;
const BASE_SIZE = 48;
const PRESS_DELTA = (BASE_SCALE - 1) * BASE_SIZE;

type PressScaleOptions = {
  /** Apply the width-derived ratio to both axes for wide text buttons. */
  uniformFromWidth?: boolean;
};

export function useFixedPressScale(
  disabled = false,
  { uniformFromWidth = false }: PressScaleOptions = {}
) {
  const [scaleX] = useState(() => new Animated.Value(1));
  const [scaleY] = useState(() => new Animated.Value(1));
  const size = useRef({ width: 0, height: 0 });
  const [holding, setHolding] = useState(false);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    size.current = { width, height };
  }, []);

  const animate = useCallback(
    (pressed: boolean) => {
      const widthScale = scaleForSize(size.current.width);
      const targetX = pressed ? widthScale : 1;
      const targetY = pressed
        ? uniformFromWidth
          ? widthScale
          : scaleForSize(size.current.height)
        : 1;

      Animated.parallel([
        Animated.timing(scaleX, {
          toValue: targetX,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(scaleY, {
          toValue: targetY,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [scaleX, scaleY, uniformFromWidth]
  );

  const pressIn = useCallback(() => {
    if (disabled) return;
    setHolding(true);
    animate(true);
  }, [animate, disabled]);

  const pressOut = useCallback(() => {
    setHolding(false);
    animate(false);
  }, [animate]);

  return {
    holding,
    onLayout,
    pressIn,
    pressOut,
    transform: [{ scaleX }, { scaleY }],
  };
}

function scaleForSize(size: number) {
  if (size <= 0) return BASE_SCALE;
  return (size + PRESS_DELTA) / size;
}
