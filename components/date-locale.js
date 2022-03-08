import { registerCustomElement } from '../js/std-js/custom-elements.js';

registerCustomElement('date-locale', class HTMLDateLocaleElement extends HTMLTimeElement {
	constructor(dtime = new Date()) {
		super();

		Promise.resolve().then(() => {
			if (dtime instanceof Date) {
				this.dateTime = dtime.toISOString();
			} else if (typeof dtime === 'string') {
				this.dateTime = new Date(dtime).toISOString();
			} else {
				this.dateTime = new Date().toISOString();
			}
		});
	}

	async connectedCallback() {
		const prom = this.whenConnected;
		this.dispatchEvent(new Event('connected'));
		await prom;
		this.textContent = new Date(this.dateTime).toLocaleDateString();
	}

	attributeChangedCallback(name) {
		switch(name) {
			case 'datetime':
				this.textContent = new Date(this.dateTime).toLocaleDateString();
				break;

			default: throw new Error(`Unhandled attribute changed: ${name}`);
		}
	}

	get whenConnected() {
		if (this.isConnected) {
			return Promise.resolve();
		} else {
			return new Promise(resolve => this.addEventListener('connected', () => resolve(), { once: true }));
		}
	}

	static get observedAttributes() {
		return [
			'datetime',
		];
	}
}, {
	extends: 'time',
});
