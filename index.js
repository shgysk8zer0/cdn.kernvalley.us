import './js/std-js/deprefixer.js';
import './js/std-js/shims.js';
import './js/std-js/shims/sanitizer.js';
import './js/std-js/shims/trustedTypes.js';
import './js/std-js/shims/locks.js';
import './js/std-js/shims/cookieStore.js';
// import { polyfill as trustPolyfill } from './js/std-js/TrustedTypes.js';
import { loadScript } from './js/std-js/loader.js';
import { SanitizerConfig as config } from './js/std-js/SanitizerConfig.js';
import { createPolicy } from './js/std-js/trust.js';
const modules = [
	'./components/current-year.js',
	'./components/github/user.js',
	'./components/github/repo.js',
	'./components/ad/block.js',
	'./components/share-button.js',
	'./components/window-controls.js',
	'./components/share-to-button/share-to-button.js',
	'./components/weather/current.js',
	'./components/weather/forecast.js',
	'./components/leaflet/map.js',
	'./components/leaflet/marker.js',
	'./components/app/list-button.js',
	'./components/app/stores.js',
	'./components/notification/html-notification.js',
	'./js/std-js/theme-cookie.js',
];

const trustedOrigins = [
	location.origin,
	'https://cdn.kernvalley.us',
];

const sanitizer = new globalThis.Sanitizer(config);

const policy = createPolicy('default', {
	createHTML: input => {
		if (['<', '>'].some(char => input.includes(char))) {
			return sanitizer.sanitizeFor('div', input).innerHTML;
		} else {
			return input;
		}
	},
	// createScript: input => {
	// 	throw new DOMException(`Untrusted attempt to create script: "${input}"`);
	// },
	createScriptURL: input => {
		if (trustedOrigins.includes(new URL(input, document.baseURI).origin)) {
			return input;
		} else {
			throw new DOMException(`Untrusted script src: <${input}>`);
		}
	}
});

Promise.allSettled([
	// trustPolyfill(),
	navigator.serviceWorker.register(policy.createScriptURL('/sw.js')).catch(console.error),
	...modules.map(src => loadScript(policy.createScriptURL(new URL(src, document.baseURI)), { type: 'module' }))
]);
