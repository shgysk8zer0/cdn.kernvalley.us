function uuidv4() {
	return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	);
}

function $(selector, base) {
	return [...base.querySelectorAll(selector)];
}

window.uuidv4 = uuidv4;

if ('customElements' in window) {
	customElements.define('payment-form', class HTMLPaymentFormElement extends HTMLFormElement {
		/*constructor(conf = [{
			supportedMethod: 'basic-card',
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
		} = {}) {
			super();
			console.log({conf, total, displayItems,shippingOptions, requestPayerName, requestPayerEmail, requestPayerPhone, requestShipping});
			this.ready.then(() => {
				this.requestPayerName  = requestPayerName;
				this.requestEmail      = requestPayerEmail;
				this.requestPayerPhone = requestPayerPhone;
				this.requestShipping   = requestShipping;
			});
		}*/

		toString() {
			return JSON.stringify(this);
		}

		toJSON() {
			const form = new FormData(this);
			const data = {
				requestId: form.get('requestId'),
				methodName: form.get('methodName'),
				details: {
					cardNumber: form.get('details[cardNumber]'),
					cardSecurityCode: form.get('details[cardSecurityCode]'),
					cardholderName: form.get('details[cardholderName]'),
					expiryMonth: form.get('details[expiryMonth]'),
					expiryYear: form.get('details[expiryYear]'),
					billingAddress: {
						recipient: form.get('details[billingAddress][recipient]'),
						organization: form.get('details[billingAddress][organization]'),
						addressLine: form.get('details[billingAddress][addressLine][]').split('\n'),
						city: form.get('details[billingAddress][city]'),
						country: form.get('details[billingAddress][country]'),
						postalCode: form.get('details[billingAddress][postalCode]'),
						region: form.get('details[billingAddress][region]'),
					},
				},
			};

			if (this.requestPayerName) {
				data.payerName = form.get('payerName');
			}

			if (this.requestPayerEmail) {
				data.payerEmail = form.get('payerEmail');
			}

			if (this.requestPayerPhone) {
				data.payerPhone = form.get('payerPhone');
			}

			if (this.requestShipping) {
				data.shippingOption = form.get('shippingOption');
				data.shippingAddress = {
					recipient: form.get('shippingAddress[recipient]'),
					organization: form.get('shippingAddress[organization]'),
					addressLine: form.get('details[billingAddress][addressLine][]').split('\n'),
					city: form.get('details[billingAddress][city]'),
					country: form.get('details[billingAddress][country]'),
					postalCode: form.get('details[billingAddress][postalCode]'),
					region: form.get('details[billingAddress][region]'),
				};
			}

			return data;
		}

		get ready() {
			return new Promise(resolve => {
				if (this.childElementCount === 0) {
					this.addEventListener('load', () => resolve(), {once: true});
				} else {
					resolve();
				}
			});
		}

		set displayItems(items) {
			if (! Array.isArray(items)) {
				throw new TypeError('displayItems must be an array');
			} else {
				this.ready.then(() => {
					const tmp = this.querySelector('#display-item-template').content;
					const table = this.querySelector('.display-items');
					const rows = items.map(item => {
						const tr = tmp.cloneNode(true);
						$('[data-field="label"]', tr).forEach(td => td.textContent = item.label);
						$('[data-field="amount"]', tr).forEach(td => td.textContent = item.amount.value);
						return tr;
					});
					table.tBodies.item(0).append(...rows);
				});
			}
		}

		set shippingOptions(opts) {
			if (! Array.isArray(opts)) {
				throw new TypeError('Shipping options must be an array');
			} else {
				this.ready.then(() => {
					const select = this.elements.shippingOption;
					const none = document.createElement('option');
					none.value = '';
					none.textContent = 'Select shipping';
					[...select.options].forEach(option => option.remove());
					select.add(none);
					const options = opts.map(opt => {
						const option = document.createElement('option');
						option.textContent = `${opt.label} $${opt.amount.value}`;
						option.value = opt.id;
						option.selected = opt.selected;
						return option;
					});
					select.append(...options);
				});
			}
		}

		get requestPayerName() {
			return this.hasAttribute('requestpayername');
		}

		set requestPayerName(req) {
			this.toggleAttribute('requestpayername', req);
		}

		get requestPayerEmail() {
			return this.hasAttribute('requestpayeremail');
		}

		set requestPayerEmail(req) {
			this.toggleAttribute('requestpayeremail', req);
		}

		get requestPayerPhone() {
			return this.hasAttribute('requestpayerphone');
		}

		set requestPayerPhone(req) {
			this.toggleAttribute('requestpayerphone', req);
		}

		get requestShipping() {
			return this.hasAttribute('requestshipping');
		}

		set requestShipping(req) {
			this.toggleAttribute('requestshipping', req);
		}

		get shippingType() {
			return this.getAttribute('shippingtype') || 'shipping';
		}

		set shippingType(type) {
			this.setAttribute('shippingtype', type);
		}

		async connectedCallback() {
			const resp = await fetch(new URL('./payment-form.html', import.meta.url));
			if (resp.ok) {
				const parser = new DOMParser();
				const frag = document.createDocumentFragment();
				const doc = parser.parseFromString(await resp.text(), 'text/html');
				frag.append(...doc.body.children);
				this.append(frag);
				this.elements.requestId.value = uuidv4();
				this.dispatchEvent(new Event('load'));
			}
		}

		async attributeChangedCallback(attr, oldVal, newVal) {
			await this.ready;
			const contactInfo = this.elements.contactInfo;
			const {requestPayerEmail, requestPayerName, requestPayerPhone} = this;
			const showContactInfo = requestPayerName || requestPayerPhone || requestPayerEmail;
			console.info({attr, newVal});

			switch(attr.toLowerCase()) {
			case 'requestpayeremail':
				var email = this.elements.payerEmail;
				email.hidden = ! requestPayerEmail;
				email.disabled = ! requestPayerEmail;
				contactInfo.disabled = ! showContactInfo;
				contactInfo.hidden = ! showContactInfo;
				break;

			case 'requestpayername':
				var name = this.elements.payerName;
				name.hidden = newVal === null;
				name.disabled = newVal === null;
				contactInfo.disabled = ! showContactInfo;
				contactInfo.hidden = ! showContactInfo;
				break;

			case 'requestpayerphone':
				var phone = this.elements.payerPhone;
				phone.hidden = newVal === null;
				phone.disabled = newVal === null;
				contactInfo.disabled = ! showContactInfo;
				contactInfo.hidden = ! showContactInfo;
				break;

			case 'requestshipping':
				var shipping = this.shippingAddress;
				var method = this.elements.shippingMethod;
				shipping.hidden = newVal === null;
				shipping.disabled = newVal === null;
				method.disabled = newVal === null;
				method.hidden = newVal === null;
				break;

			case 'shippingtype':
				console.log({attr, newVal});
				[...this.querySelectorAll('.shipping-type-label')].forEach(el => el.textContent = this.shippingType);
				break;
			}

		}

		static get observedAttributes() {
			return [
				// 'supportedmethods',
				'requestpayername',
				'requestpayeremail',
				'requestpayerphone',
				'requestshipping',
				'shippingtype',
			];
		}
	}, {extends: 'form'});
}
