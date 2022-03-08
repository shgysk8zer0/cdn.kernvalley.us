import { registerCustomElement, getCustomElement } from '../js/std-js/custom-elements.js';
import { loadScript, preload } from '../js/std-js/loader.js';
import { ShoppingCart } from '../js/std-js/ShoppingCart.js';
import { meta } from '../import.meta.js';

async function getRequest(btn, fallback = false) {
	const { requestPayerName, requestPayerEmail, requestPayerPhone,
		requestShipping, shippingOptions, supportedMethods,
		supportedNetworks, shippingType } = btn;

	if ('PaymentRequest' in window && ! fallback) {
		const cart = new ShoppingCart();
		const { total, displayItems } = await cart.paymentRequestDetails;

		const req = new PaymentRequest(
			[{ supportedMethods, data: { supportedNetworks }}],
			{ total, displayItems, shippingOptions },
			{ requestPayerName, requestPayerEmail, requestPayerPhone, requestShipping, shippingType }
		);

		if (await req.canMakePayment()) {
			return req;
		} else {
			return await getRequest(btn, true);
		}
	} else {
		let prom = Promise.resolve();
		const cart = new ShoppingCart();

		if (typeof customElements.get('payment-request') === 'undefined') {
			prom = Promise.allSettled([
				loadScript(new URL('./components/payment/request.js', meta.url), { type: 'module' }),
				preload(new URL('./components/payment/request.html', meta.url), { as: 'fetch' }),
				preload(new URL('./components/payment/request.css', meta.url), { as: 'style' }),
			]);
		}

		const [HTMLPaymentRequestElement, { total, displayItems }] = await Promise.all([
			getCustomElement('payment-request'),
			cart.paymentRequestDetails,
			prom,
		]);

		const req = new HTMLPaymentRequestElement(
			[{ supportedMethods, data: { supportedNetworks }}],
			{ total, displayItems, shippingOptions },
			{ requestPayerName, requestPayerEmail, requestPayerPhone, requestShipping, shippingType }
		);

		if (await req.canMakePayment()) {
			return req;
		} else {
			return {
				canMakePayment: async () => false,
			};
		}
	}
}


registerCustomElement('checkout-button', class HTMLCheckoutButtonElement extends HTMLButtonElement {
	constructor() {
		super();
		this.hidden = false;

		this.addEventListener('click', async () => {
			try {
				this.disabled = true;

				const req = await getRequest(this);

				if (await req.canMakePayment()) {
					this.dispatchEvent(new CustomEvent('pay', { detail: req }));
					this.disabled = false;
				} else {
					throw new Error('Payment options not supported');
				}
			} catch(err) {
				alert(err);
			}
		}, {
			capture: true,
			passive: true,
		});
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
			return ['visa', 'mastercard', 'discover', 'amex'];
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
