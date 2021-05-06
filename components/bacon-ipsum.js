const ENDPOINT = 'https://baconipsum.com/api/';
import { registerCustomElement } from '../js/std-js/custom-elements.js';
import { getJSON } from '../js/std-js/http.js';

registerCustomElement('bacon-ipsum', class HTMLBaconIpsumElement extends HTMLElement {
	constructor() {
		super();
		this.update();
	}

	get lines() {
		return [...this.children];
	}

	set lines(lines) {
		if (! Array.isArray(lines)) {
			throw new Error('Lines must be an array');
		} else {
			const els = lines.map(line => {
				if (line instanceof HTMLElement) {
					return line;
				} else if (typeof line === 'string') {
					const el = document.createElement('p');
					el.textContent = line;
					return el;
				} else {
					throw new TypeError('Attempting to set line to a non-string non-element');
				}
			});

			this.replaceChildren(...els);
		}
	}

	get paras() {
		return parseInt(this.getAttribute('paras')) || 5;
	}

	set paras(num) {
		this.setAttribute('paras', num);
	}

	get startWithLorem() {
		return this.hasAttribute('start-with-lorem');
	}

	set startWithLorem(enabled) {
		this.toggleAttribute('start-with-lorem', enabled);
	}

	get filler() {
		return this.hasAttribute('filler');
	}

	set filler(enabled) {
		this.toggleAttribute('filler', enabled);
	}

	clear() {
		this.replaceChildren();
	}

	async update({ signal } = {}) {
		const { paras, startWithLorem, filler } = this;
		const lines = await HTMLBaconIpsumElement.generate({paras, startWithLorem, filler, signal });
		this.lines = lines;
	}

	static async generate({
		paras          = 5,
		startWithLorem = true,
		filler         = false,
		signal,
	} = {}) {
		const url = new URL(ENDPOINT);

		url.searchParams.set('paras', paras);
		url.searchParams.set('format', 'json');

		if (startWithLorem) {
			url.searchParams.set('start-with-lorem', 1);
		}

		if (filler) {
			url.searchParams.set('type', 'meat-and-filler');
		} else {
			url.searchParams.set('type', 'all-meat');
		}

		return getJSON(url, { signal });
	}

	attributeChangedCallback(/*name, oldValue, newValue*/) {
		if (this.isConnected && this.lines.length !== 0) {
			this.update();
		}
	}

	static get observedAttributes() {
		return [
			'paras',
			'start-with-lorem',
			'filler',
		];
	}
});
