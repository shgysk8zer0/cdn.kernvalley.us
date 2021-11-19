import { registerCustomElement } from '../js/std-js/custom-elements.js';
const protectedData = new WeakMap();

registerCustomElement('media-query', class HTMLMediaQueryElement extends HTMLElement {
	constructor(media = null) {
		super();

		if (typeof media === 'string') {
			this.media = media;
		}
	}

	disconnectedCallback() {
		if (protectedData.has(this)) {
			const { query, handler, opts } = protectedData.get(this);
			query.removeEventListener('change', handler, opts);
			protectedData.delete(this);
		}
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch(name) {
			case 'media': {
				if (protectedData.has(this)) {
					const { query, handler, opts } = protectedData.get(this);
					query.removeEventListener('change', handler, opts);
				}

				if (typeof newValue === 'string' && newValue.length !== 0) {
					const opts = { passive: true };
					const query = matchMedia(newValue);
					const { media, matches } = query;
					const handler = ({ target: { media, matches }}) => {
						this.hidden = ! matches;
						this.dispatchEvent(new Event(matches ? 'show' : 'hide'));
						this.dispatchEvent(new CustomEvent('change', { detail: { media, matches }}));
					};

					this.hidden = ! matches;
					this.dispatchEvent(new Event(matches ? 'show' : 'hide'));
					this.dispatchEvent(new CustomEvent('change', { detail: { media, matches }}));
					protectedData.set(this, { handler, opts, query });
					query.addEventListener('change', handler, opts);
				} else {
					this.dispatchEvent(new CustomEvent('change', { detail: { media: null, matches: true }}));
					this.hidden = false;
					this.dispatchEvent(new Event('show'));
				}
				break;
			}

			default:
				throw new Error(`Unhandled attribute change: "${name}"`);
		}
	}

	get matches() {
		if (protectedData.has(this)) {
			return protectedData.get(this).query.matches;
		} else {
			return true;
		}
	}

	get query() {
		if (protectedData.has(this)) {
			return protectedData.get(this).query;
		} else {
			return null;
		}
	}

	get media() {
		return this.getAttribute('media');
	}

	set media(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('media', val);
		} else {
			this.removeAttribute('media');
		}
	}

	static get observedAttributes() {
		return ['media'];
	}
});
