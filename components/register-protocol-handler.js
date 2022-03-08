import { registerCustomElement } from '../js/std-js/custom-elements.js';

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

		Promise.resolve().then(() => {
			this.hidden = ! (navigator.registerProtocolHandler instanceof Function);

			if (typeof scheme === 'string') {
				this.scheme = scheme;
			}

			if (typeof url === 'string') {
				this.url = url;
			} else if (url instanceof URL) {
				this.url = url.href;
			}

			if (typeof name === 'string') {
				this.name = name;
			}
		});

		this.addEventListener('click', register, { passive: true, capture: true });
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
			return new URL(this.getAttribute('url'), document.baseURI).href;
		} else {
			return location.origin;
		}
	}

	set url(val) {
		if (typeof val === 'string') {
			this.setAttribute('url', val);
		} else if (val instanceof URL) {
			this.setAttribute('url', val.href);
		} else {
			this.removeAttribute('url');
		}
	}
}, {
	extends: 'button',
});
