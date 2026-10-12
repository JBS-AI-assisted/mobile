import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/lib';
import { fontScale, space, type } from '@/shared/theme';

type Props = {
  title: string;
  body?: string;
  /** Pinned below the scrolling fields, above the keyboard: the primary action lives here (thumb zone). */
  footer?: ReactNode;
  children: ReactNode;
};

/** Shared frame for form screens: safe areas, keyboard avoidance, scroll at large font sizes. */
export function FormScreen({ title, body, footer, children }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      // Android 15+ is edge-to-edge, so the OS no longer resizes the window: pad on both platforms.
      behavior="padding"
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          padding: space.md,
          paddingTop: insets.top + space.lg,
          paddingBottom: footer ? space.md : insets.bottom + space.md,
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
      {footer ? (
        <View style={{ paddingHorizontal: space.md, paddingBottom: insets.bottom + space.md, paddingTop: space.sm, gap: space.sm }}>
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
