customElements.define('date-locale', class HTMLDateLocaleElement extends HTMLTimeElement {
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

	connectedCallback() {
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

	static get observedAttributes() {
		return [
			'datetime',
		];
	}
}, {
	extends: 'time',
});
