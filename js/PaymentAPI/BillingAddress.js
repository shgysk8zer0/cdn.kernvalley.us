export default class BillingAddressFallback {
	constructor(formData) {
		if (! (formData instanceof FormData)) {
			throw new TypeError('BillingAddress fallback must be constructed with `FormData`');
		} else {
			this._formData = formData;
		}
	}

	get(name) {
		return this._formData.get(name);
	}

	get recipient() {
		return this.get('details[billingAddress][recipient]');
	}

	get organization() {
		return this.get('details[billingAddress][organization]');
	}

	get addressLine() {
		return [this.get('details[billingAddress][addressLine][]')];
	}

	get city() {
		return this.get('details[billingAddress][city]');
	}

	get country() {
		return this.get('details[billingAddress][country]');
	}

	get postalCode() {
		return this.get('details[billingAddress][postalCode]');
	}

	get region() {
		return this.get('details[billingAddress][region]');
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
