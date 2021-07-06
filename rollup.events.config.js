/* eslint-env node */
import urlResolve from 'rollup-plugin-url-resolve';
import { terser } from 'rollup-plugin-terser';

export default {
	input: 'components/krv/events.js',
	output: {
		file: 'components/krv/events.min.js',
		format: 'iife',
		sourcemap: true,
	},
	plugins: [
		urlResolve(),
		terser(),
	],
};
