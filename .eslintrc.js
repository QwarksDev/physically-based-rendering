module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',

  plugins: [
    'prettier',
    '@typescript-eslint'
  ],

  rules: {
    'prettier/prettier': 'error'
  },

  extends: [
    'plugin:prettier/recommended',
    'plugin:@typescript-eslint/recommended',
  ],
};
