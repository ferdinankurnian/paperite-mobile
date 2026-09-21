import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, type ButtonVariant } from '@/components/ui/Button';
import { useColorScheme } from '@/lib/useColorScheme';

export type ActionModalAction = {
  title: string;
  icon?: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  accessibilityLabel?: string;
  onPress?: () => void;
};

export type ActionModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  actions: ActionModalAction[];
  /** `horizontal` is useful for compact confirmations such as Cancel/Delete. */
  actionLayout?: 'stacked' | 'horizontal';
};

const OPEN_MS = 320;
const CLOSE_MS = 240;
const BACKDROP_OPACITY = 0.5;
const OFFSCREEN_BUFFER = 64;

/** Floating bottom action menu — bukan drawer, menu actions tetap memakai Button standar. */
export function ActionModal({
  visible,
  onClose,
  title,
  description,
  actions,
  actionLayout = 'stacked',
}: ActionModalProps) {
  const { colors } = useColorScheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(false);
  // static hide until the off-screen transform has actually painted —
  // native-driver Modal paints identity transform on the first frame.
  const [revealed, setRevealed] = useState(false);
  const visibleRef = useRef(visible);
  const openStartedRef = useRef(false);
  const openScheduledRef = useRef(false);
  // Put the whole card past the viewport, with a buffer so no part of it can
  // peek in when window and safe-area dimensions differ slightly.
  const offscreenY = windowHeight + OFFSCREEN_BUFFER;
  const [cardTranslateY] = useState(() => new Animated.Value(offscreenY));
  const [backdropOpacity] = useState(() => new Animated.Value(0));
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const hideOffscreen = useCallback(() => {
    cardTranslateY.setValue(offscreenY);
    backdropOpacity.setValue(0);
  }, [backdropOpacity, cardTranslateY, offscreenY]);

  const runAnimation = useCallback(
    (open: boolean, onEnd?: (finished: boolean) => void) => {
      animationRef.current?.stop();
      const easing = open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic);
      const duration = open ? OPEN_MS : CLOSE_MS;
      const animation = Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: open ? BACKDROP_OPACITY : 0,
          duration,
          easing,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: open ? 0 : offscreenY,
          duration,
          easing,
          useNativeDriver: true,
        }),
      ]);
      animationRef.current = animation;
      animation.start(({ finished }) => {
        if (animationRef.current !== animation) return;
        animationRef.current = null;
        onEnd?.(finished);
      });
    },
    [backdropOpacity, cardTranslateY, offscreenY]
  );

  const startOpen = useCallback(() => {
    if (!visibleRef.current || openStartedRef.current) return;
    openStartedRef.current = true;
    openScheduledRef.current = false;
    setRevealed(true);
    runAnimation(true);
  }, [runAnimation]);

  const scheduleOpen = useCallback(() => {
    if (openStartedRef.current || openScheduledRef.current) return;
    openScheduledRef.current = true;
    hideOffscreen();
    // Give the native Modal a frame with the offscreen state before making
    // the content visible and starting the slide + backdrop fade together.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        openScheduledRef.current = false;
        startOpen();
      });
    });
  }, [hideOffscreen, startOpen]);

  useEffect(() => {
    if (visible) {
      if (!mounted) {
        openStartedRef.current = false;
        hideOffscreen();
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mount the native Modal when its controlled prop opens
        setMounted(true);
      }
    } else if (mounted) {
      openStartedRef.current = false;
      runAnimation(false, (finished) => {
        if (!finished || visibleRef.current) return;
        setMounted(false);
        setRevealed(false);
        hideOffscreen();
      });
    }
  }, [hideOffscreen, mounted, runAnimation, visible]);

  useEffect(() => () => animationRef.current?.stop(), []);

  // Modal's native window isn't ready until onShow. The mounted effect below
  // is also a fallback for platforms where onShow is not fired.
  const handleShow = scheduleOpen;

  useEffect(() => {
    if (!mounted) return;
    scheduleOpen();
  }, [mounted, scheduleOpen]);

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onShow={handleShow}
      onRequestClose={onClose}>
      <View
        style={[styles.modalRoot, !revealed && styles.hidden]}
        pointerEvents={revealed ? 'auto' : 'none'}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        />
        <Pressable
          accessible
          accessibilityLabel={`${title} modal backdrop`}
          onPress={onClose}
          style={styles.sheetWrap}>
          <Animated.View
            style={{
              marginHorizontal: 24,
              marginBottom: Math.max(insets.bottom, 12),
              transform: [{ translateY: cardTranslateY }],
            }}>
            <Pressable
              accessibilityViewIsModal
              accessibilityRole="menu"
              onPress={() => {}}
              style={{
                padding: 16,
                gap: 14,
                borderRadius: 28,
                backgroundColor: colors.card,
                shadowColor: '#000',
                shadowOpacity: 0.18,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 10 },
                elevation: 10,
              }}>
              <View style={{ gap: 4, padding: 8 }}>
                <PaperText
                  variant="titleMedium"
                  style={{ color: colors.foreground, fontSize: 18, fontWeight: '700' }}>
                  {title}
                </PaperText>
                {description ? (
                  <PaperText variant="bodyMedium" style={{ color: colors.mutedForeground }}>
                    {description}
                  </PaperText>
                ) : null}
              </View>

              <View
                style={[styles.actions, actionLayout === 'horizontal' && styles.horizontalActions]}>
                {actions.map((action) => (
                  <Button
                    key={action.title}
                    title={action.title}
                    icon={action.icon}
                    variant={action.variant ?? 'default'}
                    disabled={action.disabled}
                    accessibilityLabel={action.accessibilityLabel}
                    style={[
                      styles.actionButton,
                      actionLayout === 'horizontal' && styles.horizontalActionButton,
                    ]}
                    onPress={() => {
                      onClose();
                      action.onPress?.();
                    }}
                  />
                ))}
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    overflow: 'hidden',
  },
  hidden: {
    opacity: 0,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  actions: {
    gap: 8,
  },
  horizontalActions: {
    flexDirection: 'row',
  },
  actionButton: {
    alignSelf: 'stretch',
  },
  horizontalActionButton: {
    flex: 1,
    minWidth: 0,
  },
});
