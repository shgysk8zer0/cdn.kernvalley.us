import {importLink} from 'https://cdn.chriszuber.com/js/std-js/functions.js';
import User from '../../js/User.js';

export default class HTMLLoginFormElement extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({mode: 'open'});

		importLink('login-form-template').then(async tmp => {
			tmp = tmp.cloneNode(true);
			const container = document.createElement('div');
			container.append(...tmp.head.children, ...tmp.body.children);
			this.shadowRoot.append(container);
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
			form.addEventListener('reset', () => container.querySelector('dialog').close());
			this.dispatchEvent(new Event('ready'));
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
