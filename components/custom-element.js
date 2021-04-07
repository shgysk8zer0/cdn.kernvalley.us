import { meta } from '../import.meta.js';
import { registerCustomElement } from '../js/std-js/custom-elements.js';
import { when } from '../js/std-js/dom.js';
import { getHTML } from '../js/std-js/http.js';
import { getDeferred } from '../js/std-js/promises.js';

let metaUrl = meta.url;
let base    = null;

const observed = new WeakMap();

const observer = ('IntersectionObserver' in window)
	? new IntersectionObserver((entries, observer) => {
		entries.forEach(({ target, isIntersecting }) => {
			if (isIntersecting && observed.has(target)) {
				const opts = observed.get(target);
				opts.resolved = true;
				opts.resolve(target);
				observer.unobserve(target);
				observed.delete(target);
			}
		});
	}, {
		rootMargin: `${Math.floor(0.5 * Math.max(screen.height, 200))}px`,
	})
	: {observe: () => {}, has: () => false, unobserve: () => {}};

export default class HTMLCustomElement extends HTMLElement {
	lazyLoad(lazy = true) {
		if (lazy && ! observed.has(this)) {
			const opts = { resolve: null, resolved: false, promise: Promise.resolve() };
			opts.promise = new Promise(resolve => opts.resolve = resolve);
			observed.set(this, opts);
			observer.observe(this);
		} else if (lazy === false) {
			if (observed.has(this)) {
				const { resolve } = observed.get(this);
				resolve(this);
			}
			observed.delete(this);
			observer.unobserve(this);
		}
	}

	connectedCallback() {
		this.dispatchEvent(new Event('connected'));
	}

	get loading() {
		return this.getAttribute('loading') || 'auto';
	}

	set loading(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('loading', val);
		} else {
			this.setAttribute('loading', val);
		}
	}

	get ready() {
		const { promise, resolve } = getDeferred();

		if (this.shadowRoot !== null && this.shadowRoot.childElementCount === 0) {
			when(this, 'ready').then(() => resolve(this));
		} else {
			resolve(this);
		}

		return promise;
	}

	get stylesLoaded() {
		return this.ready.then(() => {
			if (this.shadowRoot !== null) {
				const stylesheets = this.shadowRoot.querySelectorAll('link[rel="stylesheet"][href]:not(:disabled)');
				return Promise.allSettled([...stylesheets].map(async link => {
					if (link.sheet === null) {
						return Promise.race([
							when(link, 'load'),
							when(link, 'error'),
						]);
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
		const { resolve, promise } = getDeferred();

		if (this.isConnected) {
			resolve();
		} else {
			when(this, 'connected').then(() => resolve());
		}

		return promise;
	}

	get whenLoad() {
		if (! ('IntersectionObserver' in window)) {
			return Promise.resolve();
		} else if (observed.has(this)) {
			const { promise } = observed.get(this);
			return promise;
		} else if (this.loading === 'lazy') {
			this.lazyLoad();
			return this.whenLoad;
		} else {
			return Promise.resolve(this);
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
		return slotted.length > item ? slotted[item] : null;
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
		const current = await this.getSlotted(slot);

		if (replace && current.length === 1 && typeof content === 'string' && current[0].tagName === tag.toUpperCase()) {
			el = current[0];
			el.textContent = content;
		} else if (content instanceof HTMLElement) {
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
			if (current.length === 0) {
				this.append(el);
			} else if (current.length !== 1) {
				current.forEach(s => s.remove());
				this.append(el);
			} else if (! current[0].isSameNode(el)) {
				current[0].replaceWith(el);
			}
		} else {
			this.append(el);
		}
		return el;
	}

	async getTemplate(url, init = {}) {
		url = new URL(url, HTMLCustomElement.base);
		const frag = await getHTML(url, init);

		frag.querySelectorAll('link[href]').forEach(link => link.href = new URL(link.getAttribute('href'), url).href);
		frag.querySelectorAll('img[src]').forEach(img => img.src = new URL(img.getAttribute('src'), url).href);
		frag.querySelectorAll('script[src]').forEach(script => script.src = new URL(script.getAttribute('src'), url).href);
		return frag;
	}

	static get base() {
		if (typeof base === 'string') {
			return base;
		} else if (document.documentElement.dataset.hasOwnProperty('componentBase')) {
			return new URL(document.documentElement.dataset.componentBase, document.baseURI).href;
		} else {
			return metaUrl;
		}
	}

	static set base(val) {
		base = val;
	}

	static register(tag, cls, ...rest) {
		return registerCustomElement(tag, cls, ...rest);
	}
}
