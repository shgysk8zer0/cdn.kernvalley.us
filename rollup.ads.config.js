/* eslint-env node */
import { getConfig } from '@shgysk8zer0/js-utils/rollup';
import { rollupImport } from '@shgysk8zer0/rollup-import/import';
import { importmap } from '@shgysk8zer0/importmap';

export default getConfig('./components/ad/block.js', {
	plugins: [
		rollupImport(importmap),
	],
	minify: true,
	sourcemap: true,
	format: 'iife',
});
