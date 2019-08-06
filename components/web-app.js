import '../js/std-js/deprefixer.js';
import '../js/std-js/shims.js';
import './share-button.js';
import './current-year.js';
import './login-button.js';
import './register-button.js';
import './logout-button.js';
import './gravatar-img.js';
import './imgur-img.js';
import './login-form/login-form.js';
import './registration-form/registration-form.js';

customElements.define('web-app', class HTMLWebAppElement extends HTMLHtmlElement {
	constructor() {
		super();

		this.classList.replace('no-js', 'js');
		this.classList.toggle('no-dialog', ! document.documentElement.supports('dialog'));
		this.classList.toggle('no-details', ! document.documentElement.supports('details'));
		this.body.classList.add('grid', 'color-default', 'background-primary', 'font-main');

		if (! this.hasAttribute('layout')) {
			this.layout = 'default';
		}

		if (! this.hasAttribute('theme')) {
			this.theme = 'default';
		}

		if (! this.hasAttribute('scope')) {
			this.scope = new URL(document.baseURI).pathname;
		}
	}

	get head() {
		return this.ownerDocument.head;
	}

	get body() {
		return this.ownerDocument.body;
	}

	get scope() {
		return this.getAttribute('scope') || new URL(document.baseURI).pathname;
	}

	set scope(scope) {
		if (typeof scope === 'string') {
			this.setAttribute('scope', scope);
		} else {
			this.removeAttribute('scope');
		}
	}

	get theme() {
		return this.getAttribute('theme') || 'default';
	}

	set theme(theme) {
		if (typeof theme === 'string') {
			this.setAttribute('theme', theme);
		} else {
			this.removeAttribute('theme');
		}
	}

	get favicon() {
		const link = this.querySelector('link[rel="icon"][type="image/svg+xml"][href]');
		if (link instanceof HTMLLinkElement) {
			return link.href;
		} else {
			return '';
		}
	}

	get layout() {
		return this.getAttribute('layout') || 'default';
	}

	set layout(layout) {
		if (typeof layout === 'string') {
			this.setAttribute('layout', layout);
		} else {
			this.removeAttribute('layout');
		}
	}

	get title() {
		return document.title;
	}

	set title(title) {
		document.title = title;
	}

	get description() {
		const el = this.querySelector('meta[name="description"]');
		return el instanceof HTMLMetaElement ? el.content : null;
	}

	set description(text) {
		[...this.querySelectorAll('meta[name="description"], meta[itemprop="description"], meta[property="og:description"], meta[name="twitter:description"]')]
			.forEach(el => el.content = text);
	}

	get keywords() {
		const el = this.querySelector('meta[name="keywords"]');
		return el instanceof HTMLMetaElement
			? el.content.split(',').map(kw => kw.trim())
			: [];
	}

	set keywords(text) {
		[...this.querySelectorAll('meta[name="keywords"], meta[itemprop="keywords"], meta[property="og:keywords"], meta[name="twitter:keywords"]')]
			.forEach(el => el.content = text);
	}

	get serviceWorker() {
		return new Promise(async (resolve, reject) => {
			if (! this.hasAttribute('serviceworker')) {
				reject(new Error('No `serviceworker` attribute set'));
			} else if (! ('serviceWorker' in navigator)) {
				throw new Error('Service workers are not supported');
			} else {
				const worker = await navigator.serviceWorker.getRegistration(this.scope);
				resolve(worker);
			}
		});
	}

	set serviceWorker(src) {
		if (typeof src === 'string') {
			this.setAttribute('serviceworker', src);
		} else {
			this.removeAttribute('serviceworker');
		}
	}

	get ready() {
		return new Promise(resolve => {
			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', () => resolve(), {once: true});
			} else {
				resolve();
			}
		});
	}

	get loaded() {
		return new Promise(resolve => {
			if (document.readyState === 'complete') {
				resolve();
			} else {
				window.addEventListener('load', () => resolve(), {once: true});
			}
		});
	}

	supports(tagName) {
		return ! (document.createElement(tagName) instanceof HTMLUnknownElement);
	}

	get manifest() {
		return new Promise(async (resolve, reject) => {
			const meta = this.querySelector('link[rel="manifest"][href]');

			if (meta instanceof HTMLLinkElement) {
				const resp = await fetch(meta.href);
				if (resp.ok) {
					resolve(await resp.json());
				} else {
					throw new Error(`${resp.url} [${resp.status} ${resp.statusText}]`);
				}
			} else {
				reject(new Error('No <link rel="manifest"/> found'));
			}
		});
	}

	get geoLocation() {
		/*https://developer.mozilla.org/en-US/docs/Web/API/Geolocation.getCurrentPosition*/
		return new Promise((resolve, reject) => {
			if (!('geolocation' in navigator)) {
				reject('Your browser does not support GeoLocation');
			}
			navigator.geolocation.getCurrentPosition(resolve, reject, {
				enableHighAccuracy: true,
			});
		});
	}

	async import(src, {
		method         = 'GET',
		headers        = new Headers({
			Accept: 'text/html',
		}),
		mode           = undefined,
		credentials    = 'omit',
		cache          = 'default',
		referrerPolicy = undefined,
		integrity      = undefined,
	} = {}) {
		const parser = new DOMParser();
		const resp = await fetch(src, {
			method,
			headers,
			mode,
			credentials,
			cache,
			referrerPolicy,
			integrity,
		});

		if (resp.ok) {
			const html = await resp.text();
			const frag = document.createDocumentFragment();
			const {head, body} = parser.parseFromString(html, 'text/html');
			frag.append(...head.children, ...body.children);
			return frag;
		} else {
			throw new Error(`${resp.url} [${resp.status} ${resp.statusText}]`);
		}
	}

	async notify(title, {
		body               = '',
		icon               = this.favicon,
		dir                = this.dir,
		lang               = this.lang,
		tag                = '',
		data               = null,
		vibrate            = false,
		renotify           = false,
		requireInteraction = false,
		actions            = [],
		silent             = false,
		noscreen           = false,
		sticky             = false,
	} = {}) {
		console.log({lang});
		return await new Promise(async (resolve, reject) => {
			try {
				if (! (window.Notification instanceof Function)) {
					throw new Error('Notifications not supported');
				} else if (Notification.permission === 'denied') {
					throw new Error('Notification permission denied');
				} else if (Notification.permission === 'default') {
					await new Promise(async (resolve, reject) => {
						const resp = await Notification.requestPermission();

						if (resp === 'granted') {
							resolve();
						} else {
							reject(new Error('Notification permission not granted'));
						}
					});
				}

				const notification = new Notification(title, {
					body,
					icon,
					dir,
					lang,
					tag,
					data,
					vibrate,
					renotify,
					requireInteraction,
					actions,
					silent,
					noscreen,
					sticky,
				});

				notification.addEventListener('show', event => resolve(event.target), {once: true});
				notification.addEventListener('error', event => reject(event.target), {once: true});
			} catch (err) {
				reject(err);
			}
		});
	}

	async attributeChangedCallback(name, oldVal, newVal) {
		if (this.isConnected) {
			switch(name.toLowerCase()) {
			case 'serviceworker':
				if ('serviceWorker' in navigator) {
					if (oldVal !== null) {
						const worker = await this.serviceWorker;
						if (worker) {
							await worker.unregister();
						}
					}

					if (newVal !== null) {
						await navigator.serviceWorker.register(newVal, {scope: this.scope});
					}
				}
				break;
			case 'theme':
				this.dispatchEvent(new Event('themechange'));
				break;
			case 'layout':
				this.dispatchEvent(new Event('layoutchange'));
				break;
			case 'scope':
				this.dispatchEvent(new Event('scopechange'));
				break;
			default:
				throw new Error(`Unhandled attribute changed: ${name}`);
			}
		}
	}

	static get observedAttributes() {
		return [
			'serviceworker',
			'theme',
			'layout',
			'scope',
		];
	}
}, {extends: 'html'});
