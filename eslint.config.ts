import { defineConfig } from 'eslint/config';
// @ts-expect-error eslint-config-expo ships no type declarations
import expo from 'eslint-config-expo/flat';

// Design-token enforcement: colors, spacing, radii and type sizes come from
// `src/shared/theme/tokens.ts` only. Zero is allowed (or use `space.none`).
const SPACING_PROPS =
  '/^(margin|padding)(Top|Bottom|Left|Right|Start|End|Horizontal|Vertical)?$|^(gap|rowGap|columnGap)$/';
const RADIUS_PROPS = '/^border(Top|Bottom)?(Left|Right|Start|End)?Radius$/';
const TYPE_PROPS = '/^(fontSize|lineHeight|letterSpacing)$/';
const NON_ZERO = '[value.type="Literal"][value.value!=0]';
const NEGATIVE = '[value.type="UnaryExpression"]';

const tokenRules = {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'Literal[value=/^(#[0-9a-fA-F]{3,8}|(rgb|rgba|hsl|hsla)[(].*)$/]',
      message: 'Hard-coded color. Use colors.* from @/shared/theme.',
    },
    {
      selector: `Property[key.name=${SPACING_PROPS}]:matches(${NON_ZERO}, ${NEGATIVE})`,
      message: 'Hard-coded spacing. Use space.* from @/shared/theme (space.none for 0).',
    },
    {
      selector: `Property[key.name=${RADIUS_PROPS}]${NON_ZERO}`,
      message: 'Hard-coded radius. Use radius.* from @/shared/theme.',
    },
    {
      selector: `Property[key.name=${TYPE_PROPS}]${NON_ZERO}`,
      message: 'Hard-coded type size. Use type.* from @/shared/theme.',
    },
  ],
};

// Feature-Sliced Design (ADR 0003): a layer imports only from layers below it,
// slices never import each other, and everything is imported through the public API (index.ts).
const LAYERS = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'] as const;

const layerPatterns = (layer: string) => [`@/${layer}`, `@/${layer}/*`];
const forbidAbove = (layer: (typeof LAYERS)[number]) =>
  LAYERS.slice(0, LAYERS.indexOf(layer)).flatMap(layerPatterns);

const fsdRule = (layer: (typeof LAYERS)[number]) => ({
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: forbidAbove(layer),
          message: `FSD: ${layer} cannot import from a layer above it.`,
        },
        ...(layer === 'shared' || layer === 'app'
          ? []
          : [{ group: [`@/${layer}/*`], message: `FSD: slices in ${layer} cannot import each other. Move shared code down a layer.` }]),
        {
          group: ['@/*/*/*', '@/shared/*/*'],
          message: 'FSD: import through the slice public API (index.ts), not its internals.',
        },
      ],
    },
  ],
});

export default defineConfig([
  expo,
  { ignores: ['dist/*', '.expo/*', 'src/shared/api/schema.d.ts'] },
  { files: ['src/**/*.{ts,tsx}'], rules: tokenRules },
  {
    files: ['src/shared/theme/**', 'src/**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  ...LAYERS.filter((layer) => layer !== 'app').map((layer) => ({
    files: [`src/${layer}/**/*.{ts,tsx}`],
    ignores: ['src/**/*.test.{ts,tsx}'],
    rules: fsdRule(layer),
  })),
]);
