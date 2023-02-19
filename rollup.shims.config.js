/* eslint-env node */
import urlResolve from 'rollup-plugin-url-resolve';
import { terser } from 'rollup-plugin-terser';

export default {
	input: 'js/std-js/shims.js',
	output: {
		file: 'js/shims.min.js',
		format: 'iife',
		sourcemap: true,
	},
	plugins: [
		urlResolve(),
		terser(),
	],
};
