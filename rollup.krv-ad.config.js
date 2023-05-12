/* eslint-env node */
import urlResolve from 'rollup-plugin-url-resolve';
import terser from '@rollup/plugin-terser';
import { rollupImport } from '@shgysk8zer0/rollup-import';

export default {
	input: 'components/krv/ad.js',
	output: {
		file: 'components/krv/ad.min.js',
		format: 'iife',
		sourcemap: true,
	},
	plugins: [
		rollupImport('importmap.json'),
		urlResolve(),
		terser(),
	],
};
