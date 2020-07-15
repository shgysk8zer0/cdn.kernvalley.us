import User from '/js/User.js';
import { registerCustomElement } from '../js/std-js/functions.js';

export default class HTMLRegisterButton extends HTMLButtonElement {
	constructor() {
		super();
		document.addEventListener('login', () => this.hidden = true);
		document.addEventListener('logout', () => this.hidden = false);
		this.hidden = User.loggedIn;
		this.addEventListener('click', async () => {
			await customElements.whenDefined('registration-form');
			const form = document.querySelector('registration-form');
			if (form instanceof HTMLElement) {
				await form.register();
			} else {
				const Login = customElements.get('registration-form');
				const form = new Login();
				document.body.append(form);
				await form.register();
			}
		});
	}
}

registerCustomElement('register-button', HTMLRegisterButton, {extends: 'button'});
