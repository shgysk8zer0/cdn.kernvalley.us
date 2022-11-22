/* eslint-env node */
import urlResolve from 'rollup-plugin-url-resolve';
import { terser } from 'rollup-plugin-terser';

export default {
	input: ['components/wfd/events.config.js'],
	output: {
		file: 'components/wfd/events.min.js',
		format: 'iife',
		sourcemap: true,
	},
	plugins: [
		urlResolve(),
		terser(),
	],
};
