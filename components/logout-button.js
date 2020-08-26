import User from '/js/User.js';
import { confirm } from '/js/std-js/asyncDialog.js';
import { registerCustomElement } from '../js/std-js/functions.js';

export default class HTMLLogoutButton extends HTMLButtonElement {
	constructor() {
		super();

		Promise.resolve().then(() => this.hidden  =! User.loggedIn);

		document.addEventListener('login', () => this.hidden = false);
		document.addEventListener('logout', () => this.hidden = true);

		this.addEventListener('click', async () => {
			if (await confirm('Are you sure you want to logout?')) {
				User.logout();
			}
		});
	}
}

registerCustomElement('logout-button', HTMLLogoutButton, {extends: 'button'});
