import { createPolicy } from './std-js/trust.js';
import { SanitizerConfig as config } from './std-js/SanitizerConfig.js';

const trustedOrigins = [
	location.origin,
	'https://cdn.kernvalley.us',
	'https://unpkg.com',
];

export const sanitizer = new globalThis.Sanitizer(config);

export const defaultPolicy = createPolicy('default', {
	createHTML: input => {
		const el = document.createElement('div');
		el.setHTML(input, { sanitizer });
		return el.innerHTML;
	},
	createScript: () => '',
	createScriptURL: input => {
		if (trustedOrigins.includes(new URL(input, document.baseURI).origin)) {
			return input;
		} else {
			throw new DOMException(`Untrusted script src: <${input}>`);
		}
	}
});
