import User from '/js/User.js';
const templateHTML = new URL('./registration-form.html', import.meta.url);

export default class HTMLRegistrationFormElement extends HTMLElement {
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
				const form = this.form;
				container.classList.toggle('no-dialog', document.createElement('dialog') instanceof HTMLUnknownElement);

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
						this.dialog.close();

					}
				});

				form.addEventListener('reset', () => container.querySelector('dialog').close());
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

	async register() {
		await this.ready();
		this.dialog.showModal();
	}
}

customElements.define('registration-form', HTMLRegistrationFormElement);
