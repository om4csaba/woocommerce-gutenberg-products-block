const { esLintConfig: baseConfig } = require( '@woocommerce/e2e-env' );

module.exports = {
	...baseConfig,
	extends: [
		...baseConfig.extends,
		'plugin:@wordpress/eslint-plugin/recommended',
		'prettier',
	],
	env: {
		'jest/globals': true,
	},
	globals: {
		...baseConfig.globals,
		wcSettings: 'readonly',
	},
	plugins: [ 'jest', 'woocommerce' ],
	rules: {
		'@wordpress/dependency-group': 'off',
		'woocommerce/dependency-group': 'error',
		'woocommerce/feature-flag': 'error',
		'valid-jsdoc': 'off',
		radix: 'error',
		yoda: [ 'error', 'never' ],
	},
};
