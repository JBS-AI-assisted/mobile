import { Pressable, Text } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { fontScale, hit, space, type } from '@/theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** For countdown or secondary states, e.g. "Resend code in 24s". */
  muted?: boolean;
  align?: 'flex-start' | 'center' | 'flex-end';
  accessibilityLabel?: string;
};

export function TextButton({ label, onPress, disabled = false, muted = false, align = 'center', accessibilityLabel }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ minHeight: hit.min, minWidth: hit.min, justifyContent: 'center', alignSelf: align, paddingHorizontal: space.xs }}
    >
      <Text
        maxFontSizeMultiplier={fontScale.maxMultiplier}
        style={[type.bodyStrong, { color: muted || disabled ? colors.textSecondary : colors.primary }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
