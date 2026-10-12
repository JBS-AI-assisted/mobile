import { useColorScheme } from 'react-native';

import { colors, type ColorScheme } from '@/shared/theme';

export function useTheme() {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, colors: colors[scheme] };
}
