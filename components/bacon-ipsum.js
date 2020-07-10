const ENDPOINT = 'https://baconipsum.com/api/';

export default class HTMLBaconIpsumElement extends HTMLElement {
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

	async update() {
		const {paras, startWithLorem, filler} = this;
		const lines = await HTMLBaconIpsumElement.generate({paras, startWithLorem, filler});
		this.lines = lines;
	}

	static async generate({
		paras          = 5,
		startWithLorem = true,
		filler         = false,
	} = {}) {
		const url = new URL(ENDPOINT);
		const headers = new Headers();

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

		headers.set('Accept', 'application/json');

		const resp = await fetch(url, {
			headers,
			mode: 'cors',
		});

		if (resp.ok) {
			return await resp.json();
		} else {
			throw new Error(`${resp.url} [${resp.status} ${resp.statusText}]`);
		}
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
}

customElements.define('bacon-ipsum', HTMLBaconIpsumElement);
