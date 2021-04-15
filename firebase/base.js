import { meta } from '../import.meta.js';
import { getHTML } from '../js/std-js/http.js';
import { loadStylesheet, loadScript, loadImage } from '../js/std-js/loader.js';
export { registerCustomElement, getCustomElement } from '../js/std-js/custom-elements.js';
export { on, off, create, css } from '../js/std-js/dom.js';
import { getDeferred, resolveOn } from '../js/std-js/promises.js';
import * as data from '../js/std-js/protectedData.js';
export { extend } from '../js/std-js/extend.js';
export const baseURL = new URL('./firebase/', meta.url);
export const VERSION = '8.3.1';
export const Plugins = {
	app: `https://www.gstatic.com/firebasejs/${VERSION}/firebase-app.js`,
	analytics: `https://www.gstatic.com/firebasejs/${VERSION}/firebase-analytics.js`,
	auth: `https://www.gstatic.com/firebasejs/${VERSION}/firebase-auth.js`,
	firestore: `https://www.gstatic.com/firebasejs/${VERSION}/firebase-firestore.js`,
	database: `https://www.gstatic.com/firebasejs/${VERSION}/firebase-database.js`,
	functions: `https://www.gstatic.com/firebasejs/${VERSION}/firebase-functions.js`,
	messaging: `https://www.gstatic.com/firebasejs/${VERSION}/firebase-messaging.js`,
	storage: `https://www.gstatic.com/firebasejs/${VERSION}/firebase-storage.js`,
	performance: `https://www.gstatic.com/firebasejs/${VERSION}/firebase-performance.js`,
	remoteConfig: `https://www.gstatic.com/firebasejs/${VERSION}/firebase-remote-config.js`,
};

export const Events = {
	initialized: 'firebase:initialized',
	ready: 'firebase:ready',
	signin: 'firebase:signin',
	signout: 'firebase.signout',
	register: 'firebase:register',
};

const eventTarget = new EventTarget();

Object.keys(Events).forEach(event => eventTarget.addEventListener(event, console.info));
/* global firebase: readonly */

export async function init(credentials) {
	if (! initialized()) {
		try {
			await firebase.initializeApp(credentials);
			eventTarget.dispatchEvent(new Event(Events.initialized));
			return globalThis.firebase;
		} catch(err) {
			console.error(err);
		}
	}
}

export async function loadPlugin(...plugins) {
	await Promise.all(plugins.map(name => {
		if (Plugins.hasOwnProperty(name)) {
			return loadScript(Plugins[name], { crossOrigin: null });
		}
	}));
}

export async function getTemplate(path, params = {}) {
	return await getHTML(new URL(path, meta.url), params);
}

export async function getStylesheet(path, params = {}) {
	return await loadStylesheet(new URL(path, meta.url), params);
}

export async function getBaseStyleshseet(shadow) {
	return await getStylesheet('./firebase/base.css', { parent: shadow });
}

export async function ready(el) {
	if (! data.has(el)) {
		await resolveOn(el, Events.ready);
	}

	return el;
}

export function initialized() {
	return 'firebase' in globalThis && Array.isArray(firebase.apps) && firebase.apps.length !== 0;
}

export async function whenInitialized() {
	if (! initialized()) {
		await resolveOn(eventTarget, Events.initialized);
	}

	return globalThis.firebase;
}

export { data, getDeferred, resolveOn, loadImage };
