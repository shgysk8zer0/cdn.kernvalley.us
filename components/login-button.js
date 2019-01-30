import User from '../js/User.js';

export default class HTMLLoginButton extends HTMLButtonElement {
	constructor() {
		super();
		document.addEventListener('login', () => this.hidden = true);
		document.addEventListener('logout', () => this.hidden = false);
		this.hidden = User.loggedIn;
		this.addEventListener('click', async () => {
			await customElements.whenDefined('login-form');
			if (! await User.loginWithCreds()) {
				document.querySelector('login-form').login();
			}
		});
	}
}

customElements.define('login-button', HTMLLoginButton, {extends: 'button'});
