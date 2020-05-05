import { meta } from '../import.meta.js';

function setAttrs(el = null, {
	attrs     = {},
	data      = {},
	css       = {},
	classList = [],
	slot      = null,
	text      = null,
} = {}) {
	if (typeof el === 'string') {
		el = document.createElement(el);
	}

	Object.entries(attrs).forEach(([key, val]) => {
		switch(typeof val) {
		case 'string':
			el.setAttribute(key, val);
			break;

		case 'boolean':
			el.toggleAttribute(key, val);
			break;

		default:
			el.setAttribute(key, '');
		}
	});

	Object.entries(data).forEach(([key, val]) => el.dataset[key] = val);
	Object.entries(css).forEach(([key, val]) => el.style.setProperty(key, val));

	if (classList.length !== 0) {
		el.classList.add(...classList);
	}

	if (typeof text === 'string') {
		el.textContent = text;
	}

	if (typeof slot === 'string') {
		el.slot = slot;
	}

	return el;
}

export default class HTMLCustomElement extends HTMLElement {
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
					}
					// @TODO Wait for `@import` loading
					// link.sheet.rules.filter(rule => rule.type === CSSRule.IMPORT_RULE)
				}));
			}
			return this;
		});
	}

	async getSlot(slot) {
		await this.ready;
		return this.shadowRoot.querySelector(`slot[name="${CSS.escape(slot)}"]`);
	}

	async getSlotted(slot) {
		const el = await this.getSlot(slot);

		if (el instanceof HTMLElement) {
			return el.assignedNodes();
		} else {
			return [];
		}
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
	} = {}) {
		if (replace) {
			await this.clearSlot(slot);
		}

		if (typeof content === 'string') {
			const el = document.createElement(tag);
			el.textContent = content;
			return this.setSlot(slot, el, {
				replace,
				attrs,
				data,
				css,
				classList,
				slot,
			});
		} else if (content instanceof HTMLElement) {
			this.append(setAttrs(content, {attrs, data, css, classList, slot}));
		} else if (Array.isArray(content)) {
			return content.map(item => this.setSlot(slot, item, {
				replace: false,
				tag,
				attrs,
				classList,
				data,
				css,
			}));
		}
	}

	async getTemplate(url, {
		cache   = 'default',
		mode    = 'cors',
		headers = new Headers({
			Accept: 'text/html',
		})
	} = {}) {
		const resp = await fetch(new URL(url, meta.url), { cache, mode, headers });
		const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
		const frag = document.createDocumentFragment();
		frag.append(...doc.head.children, ...doc.body.children);
		return frag;
	}
}
