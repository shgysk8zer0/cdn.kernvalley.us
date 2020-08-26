import { registerCustomElement } from '../js/std-js/functions.js';

registerCustomElement('time-locale', class HTMLTimeLocaleElement extends HTMLTimeElement {
	constructor(dtime = new Date()) {
		super();

		if (dtime instanceof Date) {
			this.dateTime = dtime.toISOString();
		} else if (typeof dtime === 'string') {
			this.dateTime = new Date(dtime).toISOString();
		} else {
			this.dateTime = new Date().toISOString();
		}
	}

	async connectedCallback() {
		this.dispatchEvent(new Event('connected'));
		await this.whenConnected;
		this.textContent = new Date(this.dateTime).toLocaleTimeString();
	}

	attributeChangedCallback(name) {
		switch(name) {
			case 'datetime':
				this.textContent = new Date(this.dateTime).toLocaleTimeString();
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
