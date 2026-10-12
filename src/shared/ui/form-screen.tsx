import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/lib';
import { fontScale, space, type } from '@/shared/theme';

type Props = { title: string; body?: string; children: ReactNode };

/** Shared frame for form screens: safe areas, keyboard avoidance, scroll at large font sizes. */
export function FormScreen({ title, body, children }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          padding: space.md,
          paddingTop: insets.top + space.lg,
          paddingBottom: insets.bottom + space.md,
          gap: space.md,
        }}
      >
        <Text accessibilityRole="header" maxFontSizeMultiplier={fontScale.maxMultiplier} style={[type.title, { color: colors.text }]}>
          {title}
        </Text>
        {body ? (
          <Text maxFontSizeMultiplier={fontScale.maxMultiplier} style={[type.body, { color: colors.textSecondary }]}>
            {body}
          </Text>
        ) : null}
        <View style={{ gap: space.md }}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
