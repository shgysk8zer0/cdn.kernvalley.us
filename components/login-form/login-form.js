import User from '/js/User.js';
import { meta } from '../../import.meta.js';
import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import '../gravatar-img.js';
import '../toast-message.js';
import '../register-button.js';
import '../login-button.js';
import '../logout-button.js';

const templateHTML = new URL('./components/login-form/login-form.html', meta.url);

export default class HTMLLoginFormElement extends HTMLElement {
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
				this.shadowRoot.querySelector('[type="email"]').addEventListener('input', event => {
					if (event.target.validity.valid) {
						this.shadowRoot.querySelector('[is="gravatar-img"]').email = event.target.value;
					}
				}, {
					passive: true,
				});
				const form = this.form;

				this.shadowRoot.querySelector('[is="register-button"]').addEventListener('click', () => {
					this.close();
					this.form.reset();
				});

				form.addEventListener('submit', async event => {
					event.preventDefault();
					const data = new FormData(this.form);
					const username = data.get('username');
					const password = data.get('password');

					if (await User.login({username, password, store: true})) {
						this.form.reset();
						this.toast.close();
					}
				});

				form.addEventListener('reset', () => {
					this.toast.close();
					this.shadowRoot.querySelector('[is="gravatar-img"]').hash = '';
				});
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

	async login() {
		await this.ready();
		await this.toast.show();
	}

	async close() {
		await this.toast.close();
	}
}

registerCustomElement('login-form', HTMLLoginFormElement);
