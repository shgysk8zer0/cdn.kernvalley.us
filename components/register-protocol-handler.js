import { registerCustomElement } from '../js/std-js/functions.js';

function register() {
	const { scheme, url, name } = this;
	navigator.registerProtocolHandler(scheme, url, name);
}

registerCustomElement('register-protocol-handler', class HTMLRegisterProtocolHandlerElement extends HTMLButtonElement {
	constructor({
		scheme = null,
		url    = null,
		name   = null,
	} = {}) {
		super();

		this.whenConnected.then(() => {
			if (typeof scheme === 'string') {
				this.scheme = scheme;
			}

			if (typeof url === 'string') {
				this.url = url;
			}

			if (typeof name === 'string') {
				this.name = name;
			}
		})

		this.addEventListener('click', register, { passive: true, capture: true });
	}

	connectedCallback() {
		this.dispatchEvent(new Event('conencted'));
		this.hidden = ! (navigator.registerProtocolHandler instanceof Function);
	}

	get name() {
		if (this.hasAttribute('name')) {
			return this.getAttribute('name');
		} else {
			return document.title;
		}
	}

	set name(val) {
		if (typeof val === 'string') {
			this.setAttribute('name', val);
		} else {
			this.removeAttribute('name');
		}
	}

	get scheme() {
		return this.getAttribute('scheme');
	}

	set scheme(val) {
		if (typeof val === 'string') {
			this.setAttribute('scheme', val);
		} else {
			this.removeAttribute('scheme');
		}
	}

	get url() {
		if (this.hasAttribute('url')) {
			return new URL(this.getAttribute('url'), location.origin).href;
		} else {
			return location.origin;
		}
	}

	set url(val) {
		if (typeof val === 'string') {
			this.setAttribute('url', val);
		} else {
			this.removeAttribute('url');
		}
	}

	get whenConnected() {
		if (this.isConnected) {
			return Promise.resolve();
		} else {
			return new Promise(resolve => this.addEventListener('connected', () => resolve(), { once: true }));
		}
	}
}, {
	extends: 'button',
});
