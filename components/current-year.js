import { registerCustomElement } from '../js/std-js/custom-elements.js';

export default class HTMLCurrentYearElement extends HTMLTimeElement {
	connectedCallback() {
		const now = new Date();
		this.textContent = now.getFullYear();
		this.dateTime = now.toISOString();
	}
}

registerCustomElement('current-year', HTMLCurrentYearElement, {extends: 'time'});
