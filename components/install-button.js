import './toast-message.js';

export default class HTMLInstallButtonElement extends HTMLButtonElement {
	constructor() {
		super();
		this.hidden = true;
	}

	async connectedCallback() {
		if (! this.supported) {
			this.remove();
		} else {
			await this.ready;
			await navigator.serviceWorker.register(this.src, {scope: this.scope});

			window.addEventListener('beforeinstallprompt', async event => {
				this.hidden = false;
				event.preventDefault();
				this.hidden = false;

				this.addEventListener('click', async () => {
					await customElements.whenDefined('toast-message');
					const Toast = customElements.get('toast-message');
					await Toast.toast(this.message);
					await event.prompt();
					this.remove();
				});
			}, {
				once: true,
			});
		}
	}

	attributeChangedCallback(name, oldVal, newVal) {
		switch(name) {
		case 'src':
			this.dispatchEvent(new CustomEvent('srcchange', {detail: {newVal, oldVal}}));
			break;

		case 'scope':
			this.dispatchEvent(new CustomEvent('scopechange', {detail: {newVal, oldVal}}));
			break;

		default:
			throw new Error(`Unhandled attribute change: ${name}`);
		}
	}

	get installed() {
		return this.registration.then(reg => reg instanceof ServiceWorkerRegistration);
	}

	get message() {
		if (this.hasAttribute('message')) {
			return this.getAttribute('message');
		} else {
			return 'Installing will allow offline access and quick access from your launcher/home screen';
		}
	}

	get ready() {
		return new Promise(resolve => {
			if (this.src !== null) {
				resolve(this);
			} else {
				this.addEventListener('srcchange', () => resolve(this));
			}
		});
	}


	get registration() {
		if (this.supported) {
			return navigator.serviceWorker.getRegistration();
		} else {
			return Promise.resolve(null);
		}
	}

	get src() {
		return this.hasAttribute('src') ? new URL(this.getAttribute('src'), this.scope) : null;
	}

	set src(val) {
		this.setAttribute('src', val);
	}

	set scope(val) {
		this.setAttribute('scope', val);
	}

	get scope() {
		return this.getAttribute('scope') || document.baseURI;
	}

	get supported() {
		return 'serviceWorker' in navigator;
	}

	static get observedAttributes() {
		return [
			'src',
			'scope',
		];
	}
}
