import { meta } from '../import.meta.js';
import { registerCustomElement } from '../js/std-js/functions.js';

let metaUrl = meta.url;
let base    = null;

export default class HTMLCustomElement extends HTMLElement {
	connectedCallback() {
		this.dispatchEvent(new Event('connected'));
	}

	get ready() {
		return new Promise(resolve => {
			if (this.shadowRoot !== null && this.shadowRoot.childElementCount === 0) {
				this.addEventListener('ready', () => resolve(this), {once: true});
			} else {
				resolve(this);
			}
		}).then(() => this);
	}

	get stylesLoaded() {
		return this.ready.then(async () => {
			if (this.shadowRoot !== null) {
				const stylesheets = this.shadowRoot.querySelectorAll('link[rel="stylesheet"][href]');
				await Promise.all([...stylesheets].map(async link => {
					if (! link.disabled && link.sheet === null) {
						await new Promise((res, rej) => {
							link.addEventListener('load', () => res(), {once: true});
							link.addEventListener('error', () => rej(`Error loading ${link.href}`), {once: true});
						});
					} else {
						return Promise.resolve();
					}
					// @TODO Wait for `@import` loading
					// link.sheet.rules.filter(rule => rule.type === CSSRule.IMPORT_RULE)
				}));
			}
			return this;
		});
	}

	get whenConnected() {
		if (this.isConnected) {
			return Promise.resolve();
		} else {
			return new Promise(resolve => this.addEventListener('connected', () => resolve(), { once: true }));
		}
	}

	async getSlot(slot) {
		await this.ready;
		return this.shadowRoot.querySelector(`slot[name="${CSS.escape(slot)}"]`);
	}

	async getSlotted(slot) {
		const el = await this.getSlot(slot);

		if (el instanceof HTMLElement) {
			return el.assignedElements();
		} else {
			return [];
		}
	}

	async getSlottedItem(slot, item = 0) {
		const slotted = await this.getSlotted(slot);
		return slotted[item] ?? null;
	}

	async clearSlot(slot) {
		const slotted = await this.getSlotted(slot);
		slotted.forEach(el => el.remove());
	}

	async setSlot(slot, content, {
		replace   = true,
		tag       = 'span',
		attrs     = {},
		data      = {},
		css       = {},
		classList = [],
		parts     = [],
	} = {}) {
		let el = null;

		if (content instanceof HTMLElement) {
			el = content;
		} else if (typeof content === 'string') {
			el = document.createElement(tag);
			el.textContent = content;
		} else {
			el = document.createElement(tag);
		}

		Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
		Object.entries(data).forEach(([k, v]) => el.dataset[k] = v);
		Object.entries(css).forEach(([k, v]) => el.style.setProperty(k, v));

		if (classList.length !== 0) {
			el.classList.add(...classList);
		}

		if ('part' in el && Array.isArray(parts) && parts.length !== 0) {
			el.part.add(...parts);
		}

		el.slot = slot;

		if (replace) {
			const current = await this.getSlotted(slot);

			if (current.length === 0) {
				this.append(el);
			} else if (current.length === 1) {
				current[0].replaceWith(el);
			} else {
				current.forEach(s => s.remove());
				this.append(el);
			}
		} else {
			this.append(el);
		}
		return el;
	}

	async getTemplate(url, {
		cache          = 'default',
		mode           = 'cors',
		headers        = new Headers(),
		referrerPolicy = 'no-referrer',
		redirect       = 'error',
		credentials    = 'omit',
		timeout        = 5000,
		integrity      = undefined,
		signal         = undefined,
	} = {}) {
		if (Request.prototype.hasOwnProperty('signal') && typeof signal === 'undefined') {
			const controller = new AbortController();
			setTimeout(() => controller.abort(), timeout);
			signal = controller.signal;
		}
		const init = { cache, mode, headers, referrerPolicy, redirect, credentials, integrity, signal };

		const resp = await fetch(new URL(url, HTMLCustomElement.base), init);
		const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
		const frag = document.createDocumentFragment();

		doc.querySelectorAll('link[href]').forEach(link => link.href = new URL(link.getAttribute('href'), resp.url).href);
		doc.querySelectorAll('img[src]').forEach(img => img.src = new URL(img.getAttribute('src'), resp.url).href);
		doc.querySelectorAll('script[src]').forEach(script => script.src = new URL(script.getAttribute('src'), resp.url).href);

		frag.append(...doc.head.children, ...doc.body.children);
		return frag;
	}

	static get base() {
		return base || metaUrl;
	}

	static set base(val) {
		base = val;
	}

	static register(tag, cls, ...rest) {
		return registerCustomElement(tag, cls, ...rest);
	}
}

if (document.documentElement.dataset.hasOwnProperty('componentBase')) {
	HTMLCustomElement.base = new URL(document.documentElement.dataset.componentBase, document.baseURI).href;
}
