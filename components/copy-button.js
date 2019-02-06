export default class HTMLCopyButtonElement extends HTMLButtonElement {
	connectedCallback() {
		if (navigator.clipboard && navigator.clipboard.writeText instanceof Function) {
			this.addEventListener('click', async () => await navigator.clipboard.writeText(this.text));
		} else {
			this.remove();
		}
	}

	get text() {
		if (this.hasAttribute('text')) {
			return this.getAttribute('text');
		} else if (this.selector !== null) {
			const el = document.querySelector(this.selector);
			if (el instanceof HTMLElement) {
				return this.html ? el.innerHTML : el.textContent;
			} else {
				throw new Error(`No element matching ${this.selector}`);
			}
		} else {
			throw new Error('No text or selector attribute set');
		}
	}

	set text(text) {
		this.setAttribute('text', text);
	}

	get selector() {
		return this.getAttribute('selector');
	}

	set selector(selector) {
		this.setAttribute('selector');
	}

	get html() {
		return this.hasAttribute('html');
	}

	set html(enabled) {
		this.toggleAttribute('html', enabled);
	}
}

customElements.define('copy-button', HTMLCopyButtonElement, {extends: 'button'});
