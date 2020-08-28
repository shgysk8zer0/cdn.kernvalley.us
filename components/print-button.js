import { registerCustomElement } from '../js/std-js/functions.js';

function print() {
	window.print();
}

registerCustomElement('print-button', class HTMLPrintButtonElement extends HTMLButtonElement {
	connectedCallback() {
		if (window.print instanceof Function) {
			this.addEventListener('click', print, { capture: true });
		} else {
			alert('Not supported');
			this.remove();
		}
	}
}, { extends: 'button' });
