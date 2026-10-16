import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useTheme } from '@/shared/lib';
import { fontScale, hit, space, type } from '@/shared/theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Shows a spinner in place of the label; taps are ignored. `label` stays the accessibility label. */
  loading?: boolean;
  /** For countdown or secondary states, e.g. "Resend code in 24s". */
  muted?: boolean;
  align?: 'flex-start' | 'center' | 'flex-end';
  accessibilityLabel?: string;
};

export function TextButton({ label, onPress, disabled = false, loading = false, muted = false, align = 'center', accessibilityLabel }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled && !loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={{ minHeight: hit.min, minWidth: hit.min, justifyContent: 'center', alignSelf: align, paddingHorizontal: space.xs }}
    >
      {loading ? (
        <View accessible={false}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <Text
          maxFontSizeMultiplier={fontScale.maxMultiplier}
          style={[type.bodyStrong, { color: muted || disabled ? colors.textSecondary : colors.primary }]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
