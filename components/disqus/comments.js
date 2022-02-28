import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { loadScript, preload } from '../../js/std-js/loader.js';
import { whenIntersecting } from '../../js/std-js/intersect.js';
const symbols = {
	shadow: Symbol('shadow'),
};

const preloadOpts = {
	as: 'script',
	crossOrigin: null,
	importance: 'low',
};

registerCustomElement('disqus-comments', class HTMLDisqusCommentsElement extends HTMLElement {
	constructor(site) {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });
		const slot = document.createElement('slot');
		const container = document.createElement('div');
		Object.defineProperty(this, symbols.shadow, {
			enumerable: false,
			configurable: false,
			writable: false,
			value: shadow,
		});

		container.id = 'disqus_thread';
		container.slot = 'comments';
		slot.name = 'comments';
		shadow.append(slot);
		this.append(container);


		if (typeof site === 'string') {
			preload(`https://${site}.disqus.com/embed.js`, preloadOpts);
			requestIdleCallback(() =>  this.site = site);
		}
	}

	async attributeChangedCallback(name, oldVal, newVal) {
		switch(name) {
			case 'site':
				if (typeof oldVal === 'string') {
					const slot = this[symbols.shadow].querySelector('slot[name="comments"]');
					slot.assignedElements().forEach(el => el.remove());
				}

				if (typeof newVal === 'string' && newVal.length !== 0) {
					if (this.loading === 'lazy') {
						await whenIntersecting(this);
					}

					const script = await loadScript(`https://${newVal}.disqus.com/embed.js`, {
						crossOrigin: preloadOpts.crossOrigin,
						parent: this[symbols.shadow],
					});

					script.dataset.timestamp = Date.now();
					this.dispatchEvent(new Event('ready'));
				}
				break;

				default: throw new Error(`Unhandled attribute changed: "${name}"`);
		}
	}

	get ready() {
		if (! protectedData.has(this)) {
			return new Promise(resolve => this.addEventListener('ready', () => resolve(), { once: true }));
		} else{
			return Promise.resolve();
		}
	}

	get loading() {
		return this.getAttribute('loading') || 'eager';
	}

	set loading(value) {
		if (typeof value === 'string' && value.length !== 0) {
			this.setAttribute('loading', value);
		} else {
			this.removeAttribute('loading');
		}
	}

	get site() {
		return this.getAttribute('site');
	}

	set site(val) {
		if (typeof val === 'string' && val.length !==0) {
			this.setAttribute('site', val);
			this.dispatchEvent(new Event('sitechange'));
		} else {
			this.removeAttribute('site');
			this.dispatchEvent(new Event('sitechange'));
		}
	}

	static get observedAttributes() {
		return ['site'];
	}
});
