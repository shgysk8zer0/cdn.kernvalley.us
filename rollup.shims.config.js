/* eslint-env node */
import urlResolve from 'rollup-plugin-url-resolve';
import terser from '@rollup/plugin-terser';
import { rollupImport } from '@shgysk8zer0/rollup-import';

export default {
	input: 'js/@shgysk8zer0/polyfills/all.js',
	output: {
		file: 'js/shims.min.js',
		format: 'iife',
		sourcemap: true,
	},
	plugins: [
		rollupImport('importmap.json'),
		urlResolve(),
		terser(),
	],
};
