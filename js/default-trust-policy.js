import { createPolicy } from './std-js/trust.js';
import { SanitizerConfig as config } from './std-js/SanitizerConfigW3C.js';

const trustedOrigins = [
	location.origin,
	'https://cdn.kernvalley.us',
	'https://unpkg.com',
];

export const sanitizer = new globalThis.Sanitizer(config);

export const defaultPolicy = createPolicy('default', {
	createHTML: input => {
		if (Element.prototype.setHTML instanceof Function) {
			const el = document.createElement('div');
			el.setHTML(input, { sanitizer });
			return el.innerHTML;
		} else if ('Sanitizer' in globalThis && Sanitizer.prototype.sanitizeFor instanceof Function) {
			return sanitizer.sanitizeFor('div', input).innerHTML;
		} else {
			throw new Error('No required methods are supported');
		}
			
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
