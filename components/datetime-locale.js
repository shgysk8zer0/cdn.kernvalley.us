import { registerCustomElement } from '../js/std-js/custom-elements.js';

registerCustomElement('datetime-locale', class HTMLDatetimeLocaleElement extends HTMLTimeElement {
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

	connectedCallback() {
		this.textContent = new Date(this.dateTime).toLocaleString();
	}

	attributeChangedCallback(name) {
		switch(name) {
			case 'datetime':
				this.textContent = new Date(this.dateTime).toLocaleString();
				break;

			default: throw new Error(`Unhandled attribute changed: ${name}`);
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
