import User from '/js/User.js';
import '/components/toast-message.js';
import '/components/register-button.js';
import '/components/login-button.js';
import '/components/logout-button.js';
import '/components/login-form/login-form.js';

const templateHTML = new URL('./registration-form.html', import.meta.url);

export default class HTMLRegistrationFormElement extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({mode: 'open'});
		customElements.whenDefined('toast-message').then(async () => {
			const resp = await fetch(templateHTML);
			if (resp.ok) {
				const parser = new DOMParser();
				const html = await resp.text();
				const tmp = parser.parseFromString(html, 'text/html');
				const container = document.createElement('div');
				container.append(...tmp.head.children, ...tmp.body.children);
				this.shadowRoot.append(container);
				const form = this.form;

				this.shadowRoot.querySelector('[is="login-button"]').addEventListener('click', () => {
					this.close();
					this.form.reset();
				}, {
					passive: true,
				});

				form.addEventListener('submit', async event => {
					event.preventDefault();
					const data = Object.fromEntries(new FormData(this.form).entries());
					data.store = true;

					if (await User.register(data)) {
						this.form.reset();
						this.toast.close();

					}
				});

				form.addEventListener('reset', () => this.toast.close());
				this.dispatchEvent(new Event('ready'));
			}
		});
	}

	get toast() {
		if (this.shadowRoot.childElementCount === 0) {
			throw new Error('Login form not yet ready');
		} else {
			return this.shadowRoot.querySelector('toast-message');
		}
	}

	get form() {
		return this.toast.querySelector('form');
	}

	async ready() {
		if (this.shadowRoot.childElementCount === 0) {
			await new Promise(resolve => this.addEventListener('ready', () => resolve(), {once: true}));
		}
	}

	async close() {
		await this.toast.close();
	}

	async register() {
		await this.ready();
		await this.toast.show();
	}
}

customElements.define('registration-form', HTMLRegistrationFormElement);
