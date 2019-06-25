export default class PaymentAddressFallback {
	constructor(formData) {
		if (! (formData instanceof FormData)) {
			throw new TypeError('PaymentAddress fallback must be constructed with `FormData`');
		} else {
			this._formData = formData;
		}
	}

	get(name) {
		return this._formData.get(name);
	}

	get recipient() {
		return this.get('shippingAddress[recipient]');
	}

	get organization() {
		return this.get('shippingAddress[organization]');
	}

	get addressLine() {
		return [this.get('shippingAddress[addressLine][]')];
	}

	get city() {
		return this.get('shippingAddress[city]');
	}

	get country() {
		return this.get('shippingAddress[country]');
	}

	get postalCode() {
		return this.get('shippingAddress[postalCode]');
	}

	get region() {
		return this.get('shippingAddress[region]');
	}

	toJSON() {
		const {
			recipient,
			organization,
			addressLine,
			city,
			country,
			postalCode,
			region,
		} = this;

		return {
			recipient,
			organization,
			addressLine,
			city,
			country,
			postalCode,
			region,
		};
	}
}
