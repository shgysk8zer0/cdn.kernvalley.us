/* eslint-env node */
import urlResolve from 'rollup-plugin-url-resolve';
import { terser } from 'rollup-plugin-terser';

export default {
	input: 'js/polyfill.js',
	output: {
		file: 'js/polyfill.min.js',
		format: 'iife',
		sourcemap: true,
	},
	plugins: [
		urlResolve(),
		terser(),
	],
};
