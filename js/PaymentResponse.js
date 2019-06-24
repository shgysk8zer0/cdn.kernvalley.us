export default class PaymentResponseFallback {
	constructor(event) {
		if (event instanceof Event && event.target instanceof HTMLFormElement) {
			this._data = new FormData(event.target);
			this._form = event.target;
		}
	}

	async complete(status) {
		const dialog = this._form.closest('dialog');
		if (dialog instanceof HTMLElement) {
			dialog.close(status);
		}
	}

	toJSON() {
		const data = {
			requestId: this._data.get('requestId'),
			methodName: this._data.get('methodName'),
			details: {
				cardNumber: this._data.get('details[cardNumber]'),
				cardSecurityCode: this._data.get('details[cardSecurityCode]'),
				cardholderName: this._data.get('details[cardholderName]'),
				expiryMonth: this._data.get('details[expiryMonth]'),
				expiryYear: this._data.get('details[expiryYear]'),
				billingAddress: {
					recipient: this._data.get('details[billingAddress][recipient]'),
					organization: this._data.get('details[billingAddress][organization]'),
					addressLine: this._data.get('details[billingAddress][addressLine][]').split('\n'),
					city: this._data.get('details[billingAddress][city]'),
					country: this._data.get('details[billingAddress][country]'),
					postalCode: this._data.get('details[billingAddress][postalCode]'),
					region: this._data.get('details[billingAddress][region]'),
				},
			},
		};

		if (this._data.has('payerName')) {
			data.payerName = this._data.get('payerName');
		}

		if (this._data.has('payerEmail')) {
			data.payerEmail = this._data.get('payerEmail');
		}

		if (this._data.has('payerPhone')) {
			data.payerPhone = this._data.get('payerPhone');
		}

		if (this._data.has('shippingOption')) {
			data.shippingOption = this._data.get('shippingOption');
		}

		if (this._data.has('shippingAddress[addressLine][]')) {
			data.shippingAddress = {
				recipient: this._data.get('shippingAddress[recipient]'),
				organization: this._data.get('shippingAddress[organization]'),
				addressLine: this._data.get('details[billingAddress][addressLine][]').split('\n'),
				city: this._data.get('details[billingAddress][city]'),
				country: this._data.get('details[billingAddress][country]'),
				postalCode: this._data.get('details[billingAddress][postalCode]'),
				region: this._data.get('details[billingAddress][region]'),
			};
		}

		return data;
	}
}
