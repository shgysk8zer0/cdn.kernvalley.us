import './js/std-js/deprefixer.js';
import './js/std-js/shims.js';
// import { polyfill as trustPolyfill } from './js/std-js/TrustedTypes.js';
import { polyfill as locksPolyfill } from './js/std-js/LockManager.js';
import { Sanitizer as SanitizerShim } from './js/std-js/Sanitizer.js';
import { loadScript } from './js/std-js/loader.js';
import { SanitizerConfig as config } from './js/std-js/SanitizerConfigBase.js';
// import { enforce } from './js/std-js/trust-enforcer.js';
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

let shimmed = false;
if (! ('Sanitizer' in globalThis && globalThis.Sanitizer.prototype.getConfiguration instanceof Function)) {
	globalThis.Sanitizer = SanitizerShim;
	shimmed = true;
}

const sanitizer = shimmed === false ? new globalThis.Sanitizer({
	allowElements: [...Sanitizer.getDefaultConfiguration().allowElements, 'slot', 'svg', 'svg:*'],
	allowAttributes: {...Sanitizer.getDefaultConfiguration().allowAttributes },
	blockElements: Sanitizer.getDefaultConfiguration().blockElements,
	dropAttributes: Sanitizer.getDefaultConfiguration().dropAttributes,
	dropElements: Sanitizer.getDefaultConfiguration().dropElements,
	allowCustomElements: true,
}): new globalThis.Sanitizer({
	allowElements: [...config.allowElements, 'slot', 'svg', 'svg:*'],
	allowAttributes: config.allowAttributes,
	blockElements: config.blockElements,
	dropAttributes: config.dropAttributes,
	dropElements: ['script'],
	allowCustomElements: true,
});
console.log(sanitizer.getConfiguration());
const policy = createPolicy('default', {
	createHTML: input => {
		const output = sanitizer.sanitizeFor('div', input).innerHTML;
		if (input !== output) {
			console.log({ input, output });
		}
		return output;
	},
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

console.log({ policy });
Promise.allSettled([
	// trustPolyfill(),
	locksPolyfill(),
	navigator.serviceWorker.register('/sw.js').catch(console.error),
]).then(async () => {
	// const { Sanitizer } = await import(new URL('./js/std-js/Sanitizer.js', import.meta.url));

	// enforce([policy.name, 'sanitize#html', 'empty#html', 'empty#script']);

	await Promise.allSettled(
		modules.map(src => loadScript(policy.createScriptURL(new URL(src, document.baseURI)), { type: 'module' }))
	).then(console.info);
});
