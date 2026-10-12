import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { fontScale, hit, radius, space, type } from '@/theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function PrimaryButton({ label, onPress, loading = false, disabled = false, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const inactive = disabled && !loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPressIn={() => {
        if (!loading && !disabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPress={() => {
        if (!loading && !disabled) onPress();
      }}
      style={({ pressed }) => ({
        minHeight: hit.control,
        borderRadius: radius.md,
        paddingHorizontal: space.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: inactive ? colors.surface : pressed ? colors.primaryPressed : colors.primary,
      })}
    >
      {loading ? (
        <View accessible={false}>
          <ActivityIndicator color={colors.textOnPrimary} />
        </View>
      ) : (
        <Text
          maxFontSizeMultiplier={fontScale.maxMultiplier}
          style={[type.bodyStrong, { color: inactive ? colors.textSecondary : colors.textOnPrimary }]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
