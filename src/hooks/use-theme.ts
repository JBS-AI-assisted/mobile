import { useColorScheme } from 'react-native';

import { colors, type ColorScheme } from '@/theme/tokens';

export function useTheme() {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, colors: colors[scheme] };
}
