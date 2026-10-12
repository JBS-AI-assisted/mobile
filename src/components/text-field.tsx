import { useEffect, useState, type Ref } from 'react';
import { AccessibilityInfo, Platform, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { fontScale, hit, radius, space, stroke, type } from '@/theme/tokens';

type Props = Omit<TextInputProps, 'style' | 'secureTextEntry' | 'editable'> & {
  label: string;
  error?: string;
  helper?: string;
  disabled?: boolean;
  /** Password field: secure entry with a show/hide toggle. */
  password?: boolean;
  /** React 19: ref is a plain prop. For focusing the next field or the first error. */
  ref?: Ref<TextInput>;
};

export function TextField({ label, error, helper, disabled = false, password = false, ref, onFocus, onBlur, ...input }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (error && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(error);
  }, [error]);

  const borderColor = error ? colors.danger : focused ? colors.focusRing : colors.border;
  const borderWidth = error || focused ? stroke.thick : stroke.thin;

  return (
    <View>
      <Text maxFontSizeMultiplier={fontScale.maxMultiplier} style={[type.label, { color: colors.text, marginBottom: space.xs }]}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: hit.control,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth,
          borderColor,
          paddingHorizontal: space.md - (borderWidth - stroke.thin), // keeps content still when the border thickens
        }}
      >
        <TextInput
          {...input}
          ref={ref}
          accessibilityLabel={label}
          editable={!disabled}
          secureTextEntry={password && !revealed}
          autoCorrect={password ? false : input.autoCorrect}
          maxFontSizeMultiplier={fontScale.maxMultiplier}
          placeholderTextColor={colors.textSecondary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[type.body, { flex: 1, color: disabled ? colors.textSecondary : colors.text, minHeight: hit.control - 2 * stroke.thick }]}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            disabled={disabled}
            onPress={() => setRevealed((v) => !v)}
            style={{ minWidth: hit.min, minHeight: hit.min, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text maxFontSizeMultiplier={fontScale.maxMultiplier} style={[type.label, { color: colors.primary }]}>
              {revealed ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: space.xs, marginTop: space.xs }}>
          <Text accessible={false} style={[type.caption, { color: colors.danger }]}>
            !
          </Text>
          <Text maxFontSizeMultiplier={fontScale.maxMultiplier} style={[type.caption, { flex: 1, color: colors.danger }]}>
            {error}
          </Text>
        </View>
      ) : helper ? (
        <Text maxFontSizeMultiplier={fontScale.maxMultiplier} style={[type.caption, { color: colors.textSecondary, marginTop: space.xs }]}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}
