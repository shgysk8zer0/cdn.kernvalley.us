import { registerCustomElement } from '../js/std-js/custom-elements.js';
import { ShoppingCart } from '../js/std-js/ShoppingCart.js';

registerCustomElement('checkout-button', class HTMLCheckoutButtonElement extends HTMLButtonElement {
	constructor() {
		super();

		if ('PaymentRequest' in window) {
			this.hidden = false;

			this.addEventListener('click', async () => {
				try {
					const cart = new ShoppingCart();
					const { total, displayItems } = await cart.paymentRequestDetails;
					const { requestPayerName, requestPayerEmail, requestPayerPhone,
						requestShipping, shippingOptions, supportedMethods,
						supportedNetworks, shippingType } = this;

					const req = new PaymentRequest(
						[{ supportedMethods, data: { supportedNetworks }}],
						{ total, displayItems, shippingOptions },
						{ requestPayerName, requestPayerEmail, requestPayerPhone, requestShipping, shippingType }
					);

					this.dispatchEvent(new CustomEvent('pay', { detail: req }));
				} catch(err) {
					alert(err);
				}
			});
		} else {
			this.remove();
		}
	}

	get shippingOptions() {
		const script = this.querySelector('script[type="application/json"]');

		if (script instanceof HTMLScriptElement) {
			return JSON.parse(script.text);
		} else {
			return undefined;
		}
	}

	set shippingOptions(val) {
		const script = this.querySelector('script[type="application/json"]');

		if (!Array.isArray(val) || val.length === 0) {
			if (script instanceof HTMLScriptElement) {
				script.remove();
			}
		} else if (script instanceof HTMLScriptElement) {
			script.textContent = JSON.stringify(val);
		} else {
			const dataScript = document.createElement('script');
			dataScript.setAttribute('type', 'application/json');
			dataScript.textContent = JSON.stringify(val);
			this.prepend(dataScript);
		}
	}

	get supportedMethods() {
		return this.getAttribute('supportedmethods') || 'basic-card';
	}

	set supportedMethods(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('supportedmethods', val);
		} else {
			this.removeAttribute('supportedmethods');
		}
	}

	get supportedNetworks() {
		if (this.hasAttribute('supportednetworks')) {
			return this.getAttribute('supportednetworks').split(' ');
		} else {
			return ['visa', 'mastercard', 'discovery'];
		}
	}

	set supportedNetworks(val) {
		if (Array.isArray(val) && val.length !== 0) {
			this.setAttribute('supportednetworks', val.join(' '));
		} else {
			this.removeAttribute('supportednetworks');
		}
	}

	get requestPayerName() {
		return this.hasAttribute('requestpayername');
	}

	set requestPayerName(val) {
		this.toggleAttribute('requestpayername', val);
	}

	get requestPayerEmail() {
		return this.hasAttribute('requestpayeremail');
	}

	set requestPayerEmail(val) {
		this.toggleAttribute('requestpayeremail', val);
	}

	get requestPayerPhone() {
		return this.hasAttribute('requestpayerphone');
	}

	set requestPayerPhone(val) {
		this.toggleAttribute('requestpayerphone', val);
	}

	get requestShipping() {
		const shipping = this.shippingOptions;
		return Array.isArray(shipping) && shipping.length !== 0;
	}

	get shippingType() {
		return this.getAttribute('shippingtype') || 'shipping';
	}

	set shippingType(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('shippingtype', val);
		} else {
			this.removeAttribute('shippingtype');
		}
	}
}, {
	extends: 'button',
});
