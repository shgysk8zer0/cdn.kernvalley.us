import BasicCardResponseFallback from './BasicCardResponse.js';
import PaymentAddressFallback from './PaymentAddress.js';

export default class PaymentResponseFallback extends FormData {
	constructor(event) {
		if (event instanceof Event && event.target instanceof HTMLFormElement) {
			super(event.target);
			this._form = event.target;
		} else {
			throw new TypeError('Attempting to create a PaymentResponse without a form submission');
		}
	}

	async complete(status) {
		const dialog = this._form.closest('dialog');
		if (dialog instanceof HTMLElement) {
			dialog.close(status);
		}
	}

	toJSON() {
		const {requestId, methodName, details} = this;
		const data = {requestId, methodName, details};

		if (this.has('payerName')) {
			data.payerName = this.payerName;
		}

		if (this.has('payerEmail')) {
			data.payerEmail = this.payerEmail;
		}

		if (this.has('payerPhone')) {
			data.payerPhone = this.payerPhone;
		}

		if (this.has('shippingOption')) {
			data.shippingOption = this.shippingOption;
		}

		if (this.has('shippingAddress[addressLine][]')) {
			data.shippingAddress = this.shippingAddress;
		}

		return data;
	}

	get details() {
		return new BasicCardResponseFallback(this);
	}

	get requestId() {
		return this.get('requestId');
	}

	get methodName() {
		return this.get('methodName');
	}

	get shippingOption() {
		return this.get('shippingOption');
	}

	get shippingAddress() {
		return new PaymentAddressFallback(this);
	}

	get payerEmail() {
		return this.get('payerEmail');
	}

	get payerName() {
		return this.get('payerName');
	}

	get payerPhone() {
		return this.get('payerPhone');
	}
}
