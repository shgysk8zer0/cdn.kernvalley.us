/* eslint-env node */
import urlResolve from 'rollup-plugin-url-resolve';
import terser from '@rollup/plugin-terser';
import { rollupImport } from '@shgysk8zer0/rollup-import';

export default {
	input: 'components/share-button.js',
	output: {
		file: 'components/share-button.min.js',
		format: 'iife',
		sourcemap: true,
	},
	plugins: [
		rollupImport('importmap.json'),
		urlResolve(),
		terser(),
	],
};
