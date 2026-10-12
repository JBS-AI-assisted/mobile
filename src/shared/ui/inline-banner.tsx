import { useEffect, useState } from 'react';
import { Animated, Text, View } from 'react-native';

import { useReduceMotion, useTheme } from '@/shared/lib';
import { duration, fontScale, radius, space, type } from '@/shared/theme';

type Variant = 'error' | 'warning' | 'success';

type Props = {
  variant?: Variant;
  message: string;
};

const GLYPH: Record<Variant, string> = { error: '!', warning: '!', success: '✓' };

export function InlineBanner({ variant = 'error', message }: Props) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const [opacity] = useState(() => new Animated.Value(0));
  const accent = variant === 'error' ? colors.danger : variant === 'warning' ? colors.warning : colors.success;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: reduceMotion ? duration.fast : duration.base,
      useNativeDriver: true,
    }).start();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        opacity,
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        overflow: 'hidden',
      }}
    >
      <View style={{ width: space.xs, backgroundColor: accent }} />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, padding: space.md }}>
        {/* Icon plus text: status never relies on color alone. */}
        <Text
          accessible={false}
          importantForAccessibility="no"
          maxFontSizeMultiplier={fontScale.maxMultiplier}
          style={[type.bodyStrong, { color: accent }]}
        >
          {GLYPH[variant]}
        </Text>
        <Text maxFontSizeMultiplier={fontScale.maxMultiplier} style={[type.body, { flex: 1, color: colors.text }]}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}
