import './js/std-js/deprefixer.js';
import './js/std-js/shims.js';
import { polyfill as trustPolyfill } from './js/std-js/TrustedTypes.js';
import { polyfill as locksPolyfill } from './js/std-js/LockManager.js';
import { loadScript } from './js/std-js/loader.js';
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

document.addEventListener('securitypolicyviolation', console.error);

Promise.allSettled([
	trustPolyfill(),
	locksPolyfill(),
	navigator.serviceWorker.register('/sw.js').catch(console.error),
]).then(async () => {
	const { Sanitizer } = await import(new URL('./js/std-js/Sanitizer.js', import.meta.url));
	const sanitizer = new Sanitizer({...Sanitizer.getDefaultConfiguration(), allowCustomElements: true });
	const policy = globalThis.trustedTypes.createPolicy('default', {
		createHTML: input => sanitizer.sanitizeFor('div').innerHTML,
		createScriptURL: input => {
			if ([location.origin, 'https://cdn.kernvalley.us'].includes(new URL(input).origin)) {
				return input;
			} else {
				throw new DOMException('Untrusted script src');
			}
		}
	});

	await Promise.allSettled(
		modules.map(src => loadScript(policy.createScriptURL(new URL(src, document.baseURI)), { type: 'module' }))
	).then(console.info);
});
