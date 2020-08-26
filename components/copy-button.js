import { registerCustomElement } from '../js/std-js/functions.js';

class HTMLCopyButtonElement extends HTMLButtonElement {
	constructor({
		text     = null,
		selector = null,
		property = null,
	} = {}) {
		super();

		if (navigator.clipboard && navigator.clipboard.writeText instanceof Function) {
			Promise.resolve().then(() => {
				if (typeof text === 'string') {
					this.text = text;
				}

				if (typeof selector === 'string') {
					this.selector = selector;
				}

				if (typeof property === 'string') {
					this.property = property;
				}
			});

			this.addEventListener('click', async () => {
				const { element, property, text } = this;

				if (typeof text === 'string') {
					await navigator.clipboard.writeText(text);
				} else if (element instanceof Element) {
					await navigator.clipboard.writeText(element[property] || this.getAttribute(property));
				} else {
					throw new Error('Text not set and selector is invalid');
				}
			});
		} else {
			this.remove();
		}
	}

	get element() {
		return document.querySelector(this.selector) || this;
	}

	get property() {
		return this.getAttribute('property') || 'textContent';
	}

	set property(val) {
		if (typeof val === 'string') {
			this.setAttribute('property', val);
		} else {
			this.removeAttribute('property');
		}
	}

	get text() {
		return this.getAttribute('text');
	}

	set text(text) {
		if (typeof text === 'string') {
			this.setAttribute('text', text);
		} else {
			this.removeAttribute('text');
		}
	}

	get selector() {
		return this.getAttribute('selector');
	}

	set selector(val) {
		if (typeof val === 'string') {
			this.setAttribute('selector', val);
		} else {
			this.removeAttribute(val);
		}
	}
}

registerCustomElement('copy-button', HTMLCopyButtonElement, {extends: 'button'});
