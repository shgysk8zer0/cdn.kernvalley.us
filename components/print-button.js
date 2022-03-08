import { registerCustomElement } from '../js/std-js/custom-elements.js';

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
