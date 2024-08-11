module.exports = {
    root: false,
    extends: ['eslint:recommended'],
    rules: {
        'no-unused-vars': 'warn',
    },
    parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2020,
    },
    env: {
        node: true,
    },
};
