import User from '../js/User.js';
import {confirm} from 'https://cdn.chriszuber.com//js/std-js/asyncDialog.js';

export default class HTMLLogoutButton extends HTMLButtonElement {
	constructor() {
		super();
		document.addEventListener('login', () => this.hidden = false);
		document.addEventListener('logout', () => this.hidden = true);
		this.hidden  =! User.loggedIn;
		this.addEventListener('click', async () => {
			if (await confirm('Are you sure you want to logout?')) {
				User.logout();
			}
		});
	}
}

customElements.define('logout-button', HTMLLogoutButton, {extends: 'button'});
