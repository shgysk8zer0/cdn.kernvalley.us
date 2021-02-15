import { registerCustomElement } from '../../js/std-js/custom-elements.js';

export default class HTMLPaymentRequestElement extends HTMLElement {
	constructor() {
		super();
	}

	get supportedMethods() {
		return this.getAttribute('supportedmethods') || 'basic-card';
	}

	set supportedMethods(methods) {
		this.setAttribute('supportedmethods', methods);
	}

	get supportedTypes() {
		return this.hasAttribute('supportedtypes')
			? this.getAttribute('supportedtypes').split(',').map(type => type.trim())
			: [
				'credit',
				'debit',
			];
	}

	set supportedTypes(types) {
		if (Array.isArray(types)) {
			this.setAttribute ('supportedtypes', types.join(', '));
		} else {
			throw new TypeError('Supported types must be an array of types');
		}
	}

	get supportedNetworks() {
		return this.hasAttribute('supportednetworks')
			? this.getAttribute('supportednetworks').split(',').map(net => net.trim())
			: [
				'visa',
				'mastercard',
				'discover',
			];
	}

	set supportedNetworks(networks) {
		if (Array.isArray(networks)) {
			this.setAttribute ('supportednetworks', networks.join(', '));
		} else {
			throw new TypeError('Supported networks must be an array of networks');
		}
	}

	async ready() {
		//
	}

	async connectedCallback() {
		//
	}

	async attributeChangedCallback(name, oldVal, newVal) {
		console.log({name, oldVal, newVal});
	}

	async canMakePayment() {
		const types = this.supportedTypes;
		return this.supportedNetworks.length !== 0
			&& (types.includes('credit') || types.includes('debit'));
	}

	async show() {
		//
	}

	static get observedAttributes() {
		return [
			'supportedmethods',
			'supportedtypes',
			'supportednetworks',
			'request',
		];
	}
}

registerCustomElement('payment-request', HTMLPaymentRequestElement);
