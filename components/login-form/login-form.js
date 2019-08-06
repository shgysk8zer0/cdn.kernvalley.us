import User from '/js/User.js';
import '/components/gravatar-img.js';
const templateHTML = new URL('./login-form.html', import.meta.url);
export default class HTMLLoginFormElement extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({mode: 'open'});

		fetch(templateHTML).then(async resp => {
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
				container.classList.toggle('no-dialog', document.createElement('dialog') instanceof HTMLUnknownElement);

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
						this.dialog.close();
					}
				});

				form.addEventListener('reset', () => {
					container.querySelector('dialog').close();
					this.shadowRoot.querySelector('[is="gravatar-img"]').hash = '';
				});
				this.dispatchEvent(new Event('ready'));
			}
		});
	}

	get dialog() {
		if (this.shadowRoot.childElementCount === 0) {
			throw new Error('Login form not yet ready');
		} else {
			return this.shadowRoot.querySelector('dialog');
		}
	}

	get form() {
		return this.dialog.querySelector('form');
	}

	async ready() {
		if (this.shadowRoot.childElementCount === 0) {
			await new Promise(resolve => this.addEventListener('ready', () => resolve(), {once: true}));
		}
	}

	async login() {
		await this.ready();
		this.dialog.showModal();
	}
}

customElements.define('login-form', HTMLLoginFormElement);
