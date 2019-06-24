import '../components/payment-form/payment-form.js';
import PaymentResponseFallback from './PaymentResponse.js';
import PaymentRequestUpdateEvent from './PaymentRequestUpdateEvent.js';
function closeHandler(event) {
	console.log(event);
}

function resetHandler(event) {
	event.target.closest('dialog').close('fail');
}

function $(selector, base) {
	return [...base.querySelectorAll(selector)];
}

export default class PaymentRequestFallback extends EventTarget {
	constructor(conf = [{
		supportedMethods: 'basic-card',
		data: {
			supportedNetworks: [
				'visa',
				'mastercard',
				'discover',
			],
			supportedTypes: [
				'credit',
				'debit',
			],
		},
	}], {
		total           = {},
		displayItems    = [],
		shippingOptions = [],
	} = {}, {
		requestPayerName  = false,
		requestPayerEmail = false,
		requestPayerPhone = false,
		requestShipping   = false,
		shippingType      = 'shipping',
	} = {}) {
		super();
		this._conf = conf;
		console.log({conf, total, displayItems, shippingOptions});
		customElements.whenDefined('payment-form').then(async () => {
			const dialog = document.createElement('dialog');
			const form = document.createElement('form', {is: 'payment-form'});
			form.displayItems = displayItems;
			form.shippingOptions = shippingOptions;
			form.name = 'payment';
			dialog.id = 'payment-dialog';

			form.requestPayerEmail = requestPayerEmail;
			form.requestPayerName  = requestPayerName;
			form.requestPayerPhone = requestPayerPhone;
			form.requestShipping   = requestShipping;
			form.shippingType      = shippingType;
			form.method = 'POST';

			dialog.append(form);
			document.body.append(dialog);
			await form.ready;
			this._form = form;

			$('input', form.elements.shippingAddress).forEach(input => {
				input.addEventListener('change', () => {
					this.dispatchEvent(new PaymentRequestUpdateEvent('shippingaddresschange'));
				});
			});

			form.elements.shippingOption.addEventListener('change', () => {
				this.dispatchEvent(new PaymentRequestUpdateEvent('shippingoptionchange'));
			});

			document.dispatchEvent(new Event('paymentready'));
		});
	}

	get id() {
		return this._form.elements.requestId.value;
	}

	get shippingOption() {
		return this._form.elements.shippingOption.value;
	}

	get shippingAddress() {
		const addr = this._form.elements.shippingAddress;
		return {
			recipient: addr.elements['shippingAddress[recipient]'].value,
			addressLine: [addr.elements['shippingAddress[addressLine][]'].value],
			city: addr.elements['shippingAddress[city]'].value,
			region: addr.elements['shippingAddress[region]'].value,
			postalCode: addr.elements['shippingAddress[postalCode]'].value,
			country: addr.elements['shippingAddress[country]'].value,
		};
	}

	async canMakePayment() {
		return this._conf.some(opt => opt.supportedMethods === 'basic-card');
	}

	async show() {
		return await new Promise(async (resolve, reject) => {
			await customElements.whenDefined('payment-form');

			if (! (document.forms.payment instanceof HTMLFormElement)) {
				await new Promise(resolve => document.addEventListener('paymentready', () => resolve()), {once: true});
			}

			const form = document.forms.payment;
			await form.ready;
			const dialog = document.getElementById('payment-dialog');

			form.addEventListener('submit', event => {
				event.preventDefault();
				resolve(new PaymentResponseFallback(event));
				// const data = event.target.toJSON();
				// data.complete = (status) => dialog.close(status);
				// resolve(data);
			}, {once: true});

			form.addEventListener('reset', resetHandler, {once: true});
			dialog.addEventListener('close', closeHandler, {once: true});
			dialog.showModal();
		});
	}

	abort() {
		document.getElementById('payment-dialog').close('fail');
	}
}
