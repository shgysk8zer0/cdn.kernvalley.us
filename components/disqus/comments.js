import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { loadScript, preload } from '../../js/std-js/loader.js';
import { whenIntersecting } from '../../js/std-js/intersect.js';
import { getString, setString } from '../../js/std-js/attrs.js';
import { createPolicy } from '../../js/std-js/trust.js';

// @TODO: Can creating the iframe be done using a policy?
const policy = createPolicy('disqus#script-url', {
	createScriptURL: input => {
		if (/^https:\/\/[\w-]+\.disqus\.com\/embed\.js$/.test(input)) {
			return input;
		} else {
			throw new TypeError(`Invalid Disqus URL: ${input}`);
		}
	}
});


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

		container.slot = 'comments';
		slot.name = 'comments';
		shadow.append(slot);
		this.append(container);

		slot.addEventListener('slotchange', ({ target }) => {
			target.assignedElements().forEach(el => el.id = 'disqus_thread');
		});

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

					/**
					 * Can no longer load this script within the Shadow
					 */
					const script = await loadScript(policy.createScriptURL(`https://${newVal}.disqus.com/embed.js`), {
						crossOrigin: preloadOpts.crossOrigin,
						// parent: this[symbols.shadow],
						dataset: { timestamp: Date.now() },
						referrerPolicy: 'origin',
					});

					script.dataset.timestamp = Date.now();
					this.dispatchEvent(new Event('ready'));
				}
				break;

			default: throw new Error(`Unhandled attribute changed: "${name}"`);
		}
	}

	get ready() {
		if (this[symbols.shadow].childElementCount === 0) {
			return new Promise(resolve => this.addEventListener('ready', () => resolve(), { once: true }));
		} else{
			return Promise.resolve();
		}
	}

	get loading() {
		return getString(this, 'loading', { fallback: 'eager' });
	}

	set loading(val) {
		setString(this, 'loading', val);
	}

	get site() {
		return getString(this, 'site');
	}

	set site(newValue) {
		const oldValue = getString(this, 'site');
		setString(this, 'site', newValue);
		this.dispatchEvent(new CustomEvent('sitechange', { detail: { oldValue, newValue }}));
	}

	static get observedAttributes() {
		return ['site'];
	}
});
