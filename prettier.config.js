/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
const config = {
  plugins: ['prettier-plugin-tailwindcss'],
  singleQuote: true,
  semi: true,
  bracketSpacing: true,
  bracketSameLine: false,
  jsxBracketSameLine: false,
  arrowParens: 'always',
  tabWidth: 4,
};

export default config;
