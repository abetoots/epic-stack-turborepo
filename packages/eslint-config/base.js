//plugins define new eslint rules, and configs set wether or not (and how) the rules should be applied.
/** @type {import('eslint').Linter.Config} */
const config = {
	settings: {
		'import/resolver': {
			typescript: true,
		},
	},
	extends: [
		'turbo',
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended-type-checked',
		'plugin:@typescript-eslint/stylistic-type-checked',
		'plugin:import/recommended',
		'plugin:import/typescript',
		// This disables the formatting rules in ESLint that Prettier is going to be responsible for handling.
		// Make sure it's always the last config, so it gets the chance to override other configs.
		// 'prettier',
	],
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint', 'import'],
	ignorePatterns: ['node_modules'],
}

module.exports = config
