const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');

// Design-token enforcement: colors, spacing, radii and type sizes come from
// `src/theme/tokens.ts` only. Zero is allowed (or use `space.none`).
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
      selector:
        'Literal[value=/^(#[0-9a-fA-F]{3,8}|(rgb|rgba|hsl|hsla)[(].*)$/]',
      message: 'Hard-coded color. Use colors.* from src/theme/tokens.ts.',
    },
    {
      selector: `Property[key.name=${SPACING_PROPS}]:matches(${NON_ZERO}, ${NEGATIVE})`,
      message: 'Hard-coded spacing. Use space.* from src/theme/tokens.ts (space.none for 0).',
    },
    {
      selector: `Property[key.name=${RADIUS_PROPS}]${NON_ZERO}`,
      message: 'Hard-coded radius. Use radius.* from src/theme/tokens.ts.',
    },
    {
      selector: `Property[key.name=${TYPE_PROPS}]${NON_ZERO}`,
      message: 'Hard-coded type size. Use type.* from src/theme/tokens.ts.',
    },
  ],
};

module.exports = defineConfig([
  expo,
  { ignores: ['dist/*', '.expo/*', 'src/api/schema.d.ts'] },
  { files: ['src/**/*.{ts,tsx}'], rules: tokenRules },
  { files: ['src/theme/**', 'src/**/*.test.{ts,tsx}', 'src/__tests__/**'], rules: { 'no-restricted-syntax': 'off' } },
]);
