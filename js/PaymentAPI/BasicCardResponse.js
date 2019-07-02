import BillingAddressFallback from './BillingAddress.js';
export default class BasicCardResponseFallback {
	constructor(formData) {
		if (! (formData instanceof FormData)) {
			throw new TypeError('BasicCardResponse fallback must be constructed with `FormData`');
		} else {
			this._formData = formData;
		}
	}

	get(name) {
		return this._formData.get(name);
	}

	get cardNumber() {
		return this.get('details[cardNumber]');
	}

	get cardSecurityCode() {
		return this.get('details[cardSecurityCode]');
	}

	get cardholderName() {
		return this.get('details[cardholderName]');
	}

	get expiryMonth() {
		return this.get('details[expiryMonth]');
	}

	get expiryYear() {
		return this.get('details[expiryYear]');
	}

	get billingAddress() {
		return new BillingAddressFallback(this._formData);
	}

	toJSON() {
		const {
			cardNumber,
			cardSecurityCode,
			cardholderName,
			expiryMonth,
			expiryYear,
			billingAddress,
		} = this;

		return {
			cardNumber,
			cardSecurityCode,
			cardholderName,
			expiryMonth,
			expiryYear,
			billingAddress,
		};
	}
}
