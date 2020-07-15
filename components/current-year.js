import { registerCustomElement } from '../js/std-js/functions.js';

export default class HTMLCurrentYearElement extends HTMLTimeElement {
	constructor() {
		super();
		const now = new Date();
		this.textContent = now.getFullYear();
		this.dateTime = now.toISOString();
	}
}

registerCustomElement('current-year', HTMLCurrentYearElement, {extends: 'time'});
