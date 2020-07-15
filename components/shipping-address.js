import { registerCustomElement } from '../js/std-js/functions.js';

registerCustomElement('shipping-address', class HTMLShippingAddressFieldSetElement extends HTMLFieldSetElement {
	toJSON() {
		const {recipient, addressLine, city} = this;
		return {recipient, addressLine, city};
	}

	get recipient() {
		return this.querySelector('input[name="shippingAddress[recipient]"]').value;
	}

	get addressLine() {
		return this.querySelector('[name="shippingAddress[addressLine][]"]').value.split('\n');
	}

	get city() {
		return this.querySelector('[name="shippingAddress[city]"]').value;
	}
}, {extends: 'fieldset'});
