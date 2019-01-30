import User from '../js/User.js';

export default class HTMLRegisterButton extends HTMLButtonElement {
	constructor() {
		super();
		document.addEventListener('login', () => this.hidden = true);
		document.addEventListener('logout', () => this.hidden = false);
		this.hidden = User.loggedIn;
		this.addEventListener('click', async () => {
			await customElements.whenDefined('registration-form');
			document.querySelector('registration-form').register();
		});
	}
}

customElements.define('register-button', HTMLRegisterButton, {extends: 'button'});
