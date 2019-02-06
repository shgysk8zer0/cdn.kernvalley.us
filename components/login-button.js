import User from '/js/User.js';
import '/components/login-form/login-form.js';

export default class HTMLLoginButton extends HTMLButtonElement {
	constructor() {
		super();
		this.disabled = ! navigator.onLine;
		this.hidden = User.loggedIn;
		document.addEventListener('login', () => this.hidden = true);
		document.addEventListener('logout', () => this.hidden = false);
		window.addEventListener('offline', () => this.disabled = true);
		window.addEventListener('online', () => this.disabled = false);

		this.addEventListener('click', async () => {
			await customElements.whenDefined('login-form');
			if (! await User.loginWithCreds()) {
				document.querySelector('login-form').login();
			}
		});
	}
}

customElements.define('login-button', HTMLLoginButton, {extends: 'button'});
