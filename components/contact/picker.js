import { registerCustomElement } from '../../js/std-js/custom-elements.js';

registerCustomElement('contact-picker', class HTMLContactPickerButtonElement extends HTMLButtonElement {
	constructor() {
		super();

		if ('contacts' in navigator && 'ContactsManager' in window) {

			this.addEventListener('contacts', ({ detail: { contacts }}) => alert(JSON.stringify(contacts, null, 4)));

			this.addEventListener('click', async () => {
				this.disabled = true;
				const { include, multiple } = this;

				const contacts = await navigator.contacts.select(include, { multiple }).catch(err => {
					console.error(err);
					alert(err);
					this.disabled = false;
				});

				this.dispatchEvent(new CustomEvent('contacts', { detail: { contacts }}));
				this.disabled = false;
			});
			this.hidden = false;
		} else {
			this.remove();
		}
	}

	get include() {
		if (this.hasAttribute('include')) {
			return this.getAttribute('include').trim().split(' ').filter(p => p.length !== 0)
				.map(prop => prop.toLowerCase());
		} else {
			return ['name', 'email', 'tel'];
		}
	}

	set include(props) {
		if (Array.isArray(props)) {
			this.setAttribute('include', props.map(prop => prop.toLowerCase()).join(' '));
		} else {
			this.removeAttribute('include');
		}
	}

	set multiple(val) {
		this.toggleAttribute('multiple', val);
	}
}, {
	extends: 'button',
});
