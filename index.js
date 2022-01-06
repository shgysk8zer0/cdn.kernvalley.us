import './js/std-js/deprefixer.js';
import './js/std-js/shims.js';
// import { polyfill as trustPolyfill } from './js/std-js/TrustedTypes.js';
import { polyfill as locksPolyfill } from './js/std-js/LockManager.js';
import { Sanitizer as SanitizerShim } from './js/std-js/Sanitizer.js';
import { loadScript } from './js/std-js/loader.js';
import { SanitizerConfig as config } from './js/std-js/SanitizerConfig.js';
import { enforce } from './js/std-js/trust-enforcer.js';
import { createPolicy } from './js/std-js/trust.js';
const modules = [
	'./components/current-year.js',
	'./components/github/user.js',
	'./components/ad/block.js',
	'./components/share-button.js',
	'./components/window-controls.js',
	'./components/share-to-button/share-to-button.js',
	'./components/weather/current.js',
	'./components/leaflet/map.js',
	'./components/leaflet/marker.js',
	'./components/app/list-button.js',
	'./components/app/stores.js',
	'./js/std-js/theme-cookie.js',
];

if (! ('Sanitizer' in globalThis && globalThis.Sanitizer.prototype.getConfiguration instanceof Function)) {
	globalThis.Sanitizer = SanitizerShim;
}

const sanitizer = new globalThis.Sanitizer(config);

const policy = createPolicy('default', {
	createHTML: input => sanitizer.sanitizeFor('div', input).innerHTML,
	createScript: input => {
		throw new DOMException(`Untrusted attempt to create script: "${input}"`);
	},
	createScriptURL: input => {
		if ([location.origin, 'https://cdn.kernvalley.us'].includes(new URL(input, document.baseURI).origin)) {
			return input;
		} else {
			throw new DOMException(`Untrusted script src: <${input}>`);
		}
	}
});

enforce([policy.name, 'sanitize#html', 'empty#html', 'empty#script', 'dompurify']);
Promise.allSettled([
	// trustPolyfill(),
	locksPolyfill(),
	navigator.serviceWorker.register(policy.createScriptURL('/sw.js')).catch(console.error),
	...modules.map(src => loadScript(policy.createScriptURL(new URL(src, document.baseURI)), { type: 'module' }))
]);
