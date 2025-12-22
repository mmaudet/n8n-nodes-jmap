module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint'],
	parserOptions: {
		project: './tsconfig.json',
		sourceType: 'module',
	},
	ignorePatterns: [
		'dist/**',
		'node_modules/**',
		'.eslintrc.js',
		'gulpfile.js',
	],
	rules: {
		'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
	},
};
