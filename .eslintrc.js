module.exports = {
  extends: ['standard'],
  parser: '@typescript-eslint/parser',
  env: {
    browser: true,
    jest: true,
  },
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': 'off',
    'comma-dangle': ['off'],
    semi: [1, 'always'],
    'arrow-parens': ['off', 'always'],
    'space-before-function-paren': ['off', 'never'],
    'no-new-object': 'off',
    'no-array-constructor': 'off',
  },
};
