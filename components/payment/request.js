import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { getHTML } from '../../js/std-js/http.js';
import { uuidv6 } from '../../js/std-js/uuid.js';
import { on, attr, query, animate } from '../../js/std-js/dom.js';

const protectedData = new WeakMap();

function setData(obj, data) {
	if (protectedData.has(obj)) {
		protectedData.set(obj, { ...protectedData.get(obj), ...data });
	} else {
		protectedData.set(obj, data);
	}
}

function getData(obj, key, defaultValue) {
	if (! protectedData.has(obj)) {
		return null;
	} else if (typeof key === 'string') {
		return protectedData.get(obj)[key] || defaultValue;
	} else {
		return protectedData.get(obj);
	}
}

// @SEE https://developer.mozilla.org/en-US/docs/Web/API/PaymentAddress
class BasicCardResponse {
	constructor(response) {
		if (protectedData.has(response)) {
			const data = getData(response, 'data');
			const [year, month] = data.get('cc-expiry').split('-', 2).map(parseInt);
			setData(this, {
				cardNumber: data.get('cc-num'),
				cardholderName: data.get('cc-name'),
				expiryMonth: month,
				expiryYear: year,
				billingAddress: {
					addressLine: [data.get('billing-street-address')],
					city: data.get('billing-city'),
					region: data.get('billing-region'),
					dependentLocality: '',
					postalCode: data.get('billing-postal-code'),
					country: data.get('billing-country') || 'US',
				}
			});
		}
	}
}

// @SEE https://developer.mozilla.org/en-US/docs/Web/API/PaymentResponse
class PaymentResponse extends EventTarget {
	constructor(request) {
		if (request instanceof HTMLElement && protectedData.has(request)) {
			const { shadow, args } = getData(request);
			const data = new FormData(shadow.getElementById('payment-request-form'));
			setData(this, { request, args, data });
		} else {
			throw new TypeError('Cannot construct a response without a PaymentRequest')
		}
	}

	get requestId() {
		return getData(this, 'data').id;
	}

	async complete(reason) {
		const request = getData(this, 'request');
		const shadow = getData(request, 'shadow');
		const backdrop = shadow.getElementById('payment-request-backdrop');
		const dialog = shadow.getElementById('payment-request-dialog');
		backdrop.hidden = true;
		dialog.hidden = true;
		request.remove();
	}

	async retry() {
		const request = getData(this, 'request');
		const shadow = getData(request, 'shadow');
		attr(query('fieldset:not([hidden], button', shadow), { disabled: false });
		return request.show();
	}
}

function getPaymentResonse(request) {
	if (request instanceof HTMLElement) {
		return new PaymentResponse(request)
	} else {
		throw new TypeError('data must be an instance of FormData');
	}
}

function getPromise() {
	const obj = {};

	obj.promise = new Promise((resolve, reject) => {
		obj.resolve = resolve;
		obj.reject = reject;
	});

	return obj;
}

registerCustomElement('payment-request', class HTMLPaymentRequestElement extends HTMLElement {
	constructor(...args) {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });
		const { promise, resolve, reject } = getPromise();
		setData(this, { shadow, args, promise, resolve, reject });
	}

	async connectedCallback() {
		const frag = await getHTML('/components/payment/request.html');
		frag.getElementById('payment-id').value = uuidv6();

		on(query('form', frag), {
			submit: async event => {
				event.preventDefault();
				const { resolve, shadow } = getData(this);
				const response = getPaymentResonse(this);
				attr(query('fieldset, button', shadow), { disabled: true });
				resolve(response);
				queueMicrotask(() => setData(this, getPromise()));
			},
			reset: () => {
				this.abort();
				getData(this).reject(new DOMException('User cancelled PaymentRequest'));
				queueMicrotask(() => setData(this, getPromise()));
			},
		});

		getData(this, 'shadow').append(frag);
		this.dispatchEvent(new Event('ready'));
	}

	disconnectedCallback() {
		if (protectedData.has(this)) {
			protectedData.delete(this);
		}
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
		if (this.shadowRoot.childElementCount === 0) {
			return await new Promise(r => this.addEventListener('ready', () => r(), { once: true }));
		} else {
			return await Promise.resolve();
		}
	}

	async canMakePayment() {
		const types = this.supportedTypes;
		return this.supportedNetworks.length !== 0
			&& (types.includes('credit') || types.includes('debit'));
	}

	// @SEE https://developer.mozilla.org/en-US/docs/Web/API/PaymentRequest/show
	async show() {
		await this.ready;
		const { shadow, promise } = protectedData.get(this);
		const dialog = shadow.getElementById('payment-request-dialog');
		const form = shadow.getElementById('payment-request-form');
		const backdrop = shadow.getElementById('payment-request-backdrop');

		requestAnimationFrame(() => {
			animate(dialog, [{
				opacity: 0,
				transform: 'scale(0)',
			}, {
				opacity: 1,
				transform: 'none',
			}], {
				duration: 6000,
			});

			animate(backdrop, [{
				opacity: 0,
			}, {
				opacity: 1
			}], {
				duration: 6000,
			});

			dialog.hidden = false;
			backdrop.hidden = false;
		});

		return promise;
	}

	async abort() {
		await this.ready;
		const { shadow, reject } = protectedData.get(this);
		const dialog = shadow.getElementById('payment-request-dialog');
		const backdrop = shadow.getElementById('payment-request-backdrop');
		await Promise.allSettled([
			animate(dialog, [{
				transform: 'none',
				opacity: 1,
			}, {
				transform: 'scale(0)',
				opacity: 0,
			}], {
				duration: 400
			}),
			animate(backdrop, [{
				opacity: 1,
			}, {
				opacity: 0,
			}], {
				duration: 400,
			})
		]);

		getData(this).reject(new DOMException('PaymentRequest aborted'));
		this.remove();
	}
});
