import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { getHTML } from '../../js/std-js/http.js';
import { uuidv6 } from '../../js/std-js/uuid.js';
import { on, when, create, attr, text, query, animate } from '../../js/std-js/dom.js';
import { loadStylesheet } from '../../js/std-js/loader.js';
import { meta } from '../../import.meta.js';

const protectedData = new WeakMap();

function validateCardNumber({ cardNumber, cardSecurityCode, network }) {
	return typeof cardNumber === 'string'
		&& cardNumber.length > 10
		&& parseInt(cardSecurityCode) > 100
		&& Object.keys(HTMLPaymentRequestElement.supportedCardNetworks).includes(network);
}

function isExpired(expiryYear, expiryMonth) {
	const expiresDate = new Date(parseInt(expiryYear), parseInt(expiryMonth) - 1);
	const nowDate = new Date();

	const { expires, now } = {
		expires: {
			month: expiresDate.getMonth(),
			year: expiresDate.getFullYear(),
		},
		now: {
			month: nowDate.getMonth(),
			year: nowDate.getFullYear(),
		}
	};

	return expires.year === now.year
		? expires.month < now.month
		: expires.year < now.year;
}

function validateCC(card, network) {
	if (! (card instanceof BasicCardResponse)) {
		return false;
	} else {
		const { expiryYear, expiryMonth, cardNumber, cardSecurityCode } = card;

		if (isExpired(expiryYear, expiryMonth)) {
			return false;
		} else if (! validateCardNumber({ cardNumber, cardSecurityCode, network })) {
			return false;
		} else {
			return true;
		}
	}
}

function toAmount(val) {
	if (typeof val === 'number') {
		return val.toFixed(2);
	} else {
		return toAmount(parseFloat(val));
	}
}

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

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PaymentAddress
 */
export class PaymentAddress {
	constructor(form, type) {
		if (! (form instanceof FormData)) {
			throw new TypeError('Address requires `FormData`');
		} else if (type === 'billing') {
			protectedData.set(this, {
				recipient: form.get('billing-recipient') || form.get('cc-name'),
				organization: form.get('billing-organization'),
				phone: form.get('billing-phone') || form.get('telephone'),
				addressLine: [
					form.get('billing-street-address'),
					form.get('billing-street-address2'),
					form.get('billing-street-address3'),
				].filter(l => typeof l === 'string' && l.trim().length !== 0),
				city: form.get('billing-city'),
				region: form.get('billing-region'),
				dependentLocality: '',
				postalCode: form.get('billing-postal-code'),
				country: form.get('billing-country') || 'US',
				sortingCode: '',
				languageCode: navigator.language,
			});
		} else if (type === 'shipping') {
			protectedData.set(this, {
				recipient: form.get('shipping-recipient'),
				organization: form.get('shipping-organization'),
				phone: form.get('shipping-phone') || form.get('telephone'),
				addressLine: [
					form.get('shipping-street-address'),
					form.get('shipping-street-address2'),
					form.get('shipping-street-address3'),
				].filter(l => typeof l === 'string' && l.trim().length !== 0),
				city: form.get('shipping-city'),
				region: form.get('shipping-region'),
				dependentLocality: '',
				postalCode: form.get('shipping-postal-code'),
				country: form.get('shipping-country') || 'US',
				sortingCode: '',
			});
		}
	}

	toJSON() {
		return protectedData.get(this);
	}

	get addressLine() {
		return getData(this, 'addressLine');
	}

	get city() {
		return getData(this, 'city');
	}

	get region() {
		return getData(this, 'region');
	}

	get dependentLocality() {
		return getData(this, 'dependentLocality');
	}

	get postalCode() {
		return getData(this, 'postalCode');
	}

	get country() {
		return getData(this, 'country');
	}
}

// @SEE https://developer.mozilla.org/en-US/docs/Web/API/BasicCardResponse
export class BasicCardResponse {
	constructor(form) {
		if (form instanceof FormData) {
			const [year, month] = form.get('cc-expiry').split('-', 2).map(n => parseInt(n));
			setData(this, {
				cardNumber: form.get('cc-num'),
				cardholderName: form.get('cc-name'),
				cardSecurityCode: form.get('cc-cvc'),
				expiryMonth: month.toString().padStart(2, '0'),
				expiryYear: year.toString(),
				billingAddress: new PaymentAddress(form, 'billing'),
			});
		}
	}

	get cardNumber() {
		return getData(this, 'cardNumber');
	}

	get cardholderName() {
		return getData(this, 'cardholderName');
	}

	get cardSecurityCode() {
		return getData(this, 'cardSecurityCode');
	}

	get expiryMonth() {
		return getData(this, 'expiryMonth');
	}

	get expiryYear() {
		return getData(this, 'expiryYear');
	}

	get billingAddress() {
		return getData(this, 'billingAddress');
	}

	toJSON() {
		return getData(this);
	}
}

// @SEE https://developer.mozilla.org/en-US/docs/Web/API/PaymentResponse
export class PaymentResponse extends EventTarget {
	constructor(request) {
		super();

		if (request instanceof HTMLElement && protectedData.has(request)) {
			const { shadow, options: { requestPayerName, requestPayerEmail, requestPayerPhone, requestShipping }} = getData(request);
			const form = new FormData(shadow.getElementById('payment-request-form'));
			const card = new BasicCardResponse(form);

			if (! validateCC(card, form.get('cc-type'))) {
				throw new DOMException('Invalid card info');
			}

			const data = {
				requestId: form.get('id'),
				methodName: 'basic-card',
				details: card,
			};

			if (requestShipping) {
				data.shippingOption = form.get('shippingOption');
				data.shippingAddress = new PaymentAddress(form, 'shipping');
			}

			if (requestPayerName) {
				data.payerName = form.get('name');
			}

			if (requestPayerEmail) {
				data.payerEmail = form.get('email');
			}

			if (requestPayerPhone) {
				data.payerPhone = form.get('telephone');
			}


			setData(this, { request, data });
		} else {
			throw new TypeError('Cannot construct a response without a PaymentRequest');
		}
	}

	toJSON() {
		return getData(this, 'data');
	}

	get requestId() {
		return getData(this, 'data').id;
	}

	get details() {
		return getData(this, 'data').details;
	}

	get methodName() {
		return getData(this, 'data').methodName;
	}

	get payerName() {
		return getData(this, 'data').payerName;
	}

	get payerEmail() {
		return getData(this, 'data').payerEmail;
	}

	get payerPhone() {
		return getData(this, 'data').payerPhone;
	}

	get shippingOption() {
		return getData(this, 'data').shippingOption;
	}

	get shippingAddress() {
		return getData(this, 'data').shippingAddress;
	}

	async complete(/*reason*/) {
		const request = getData(this, 'request');
		const shadow = getData(request, 'shadow');
		const backdrop = shadow.getElementById('payment-request-backdrop');
		const dialog = shadow.getElementById('payment-request-dialog');
		backdrop.hidden = true;
		dialog.hidden = true;
		request.remove();
	}

	/**
	 * @TODO Dispatch `payerdetailchange` event when retry completes.
	 * This should also update this response instead of returning another
	 */
	async retry() {
		const request = getData(this, 'request');
		const shadow = getData(request, 'shadow');
		attr(query('fieldset:not([hidden], button', shadow), { disabled: false });
		return request.show();
	}
}

function getPaymentResonse(request) {
	if (request instanceof HTMLElement) {
		return new PaymentResponse(request);
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

/**
 * @TODO Dispatch various change events
 * @SEE https://developer.mozilla.org/en-US/docs/Web/API/PaymentRequest#events
 */
export class HTMLPaymentRequestElement extends HTMLElement {
	constructor(methodData, {
		total,
		id = uuidv6(),
		displayItems = [],
		shippingOptions = [],
		modifiers,
	}, {
		requestPayerName = false,
		requestPayerEmail = false,
		requestPayerPhone = false,
		requestShipping = false,
		shippingType = 'shipping',
	} = {}) {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });
		const { promise, resolve, reject } = getPromise();

		const cardRequest = methodData.find(({ supportedMethods }) => supportedMethods === 'basic-card');
		if (typeof cardRequest === 'undefined') {
			throw new TypeError('Currently only supports BasicCardRequest types');
		}
		if (! ('data' in cardRequest)) {
			cardRequest.data = {
				supportedNetworks: Object.keys(HTMLPaymentRequestElement.supportedCardNetworks),
			};
		}
		if (! Array.isArray(cardRequest.data.supportedNetworks)
			||cardRequest.data.supportedNetworks.length === 0
		) {
			cardRequest.data.supportedNetworks = Object.keys(HTMLPaymentRequestElement.supportedCardNetworks);
		}

		setData(this, { shadow, methodData, promise, resolve, reject,
			details: { total, id, displayItems, shippingOptions, modifiers },
			options: { requestPayerName, requestPayerEmail, requestPayerPhone,
				requestShipping, shippingType }});

		queueMicrotask(() => this.id = id);
	}

	async connectedCallback() {
		const frag = await getHTML(new URL('./components/payment/request.html', meta.url));
		const { methodData, shadow,
			details: { id, total, displayItems, shippingOptions },
			options: { requestPayerName, requestPayerEmail, requestPayerPhone, requestShipping/*, shippingType*/ },
		} = getData(this);

		const requestPayerInfo = requestPayerName || requestPayerEmail || requestPayerPhone;

		if (! methodData.some(({ supportedMethods }) => supportedMethods === 'basic-card')) {
			throw new TypeError('<payment-request> currently only suports BasiCardRequest');
		}

		const statesList = frag.getElementById('states-options').content;
		const itemTemplate = frag.getElementById('display-item-template').content;
		frag.getElementById('payment-shipping-state').append(statesList.cloneNode(true));
		frag.getElementById('payment-billing-state').append(statesList.cloneNode(true));

		const items = await Promise.all(displayItems.map(async ({ label,  amount: { value }}) => {
			const base = itemTemplate.cloneNode(true);
			await Promise.allSettled([
				text('.item-label', label, { base }),
				text('.item-amount-value', toAmount(value), { base }),
			]);
			return base;
		}));

		await Promise.all([
			text('.site-name', document.title, { base: frag }),
			text('.site-hostname', location.hostname, { base: frag }),
		]);

		this.append(
			create('b', {
				slot: 'total-label',
				text: total.label,
			}),
			create('b', {
				slot: 'total-amount-value',
				text: toAmount(total.amount.value),
			}),
			...items,
		);
		const networks = HTMLPaymentRequestElement.supportedCardNetworks;
		const types = methodData.find(({ supportedMethods }) => supportedMethods === 'basic-card')
			.data.supportedNetworks.map(type => {
				const opt = document.createElement('option');
				opt.value = type;
				opt.textContent = networks[type] || 'Unknown Card Type';
				return opt;
			});

		await frag.getElementById('payment-billing-cc-type').append(...types);

		if (requestPayerInfo === false) {
			await attr('#payment-contact-section', {
				hidden: true,
				disabled: true,
			}, { base: frag });
		} else {
			if (requestPayerName === false) {
				frag.getElementById('payer-name-field').remove();
			}

			if (requestPayerEmail === false) {
				frag.getElementById('payer-phone-field').remove();
			}

			if (requestPayerPhone === false) {
				frag.getElementById('payer-phone-field').remove();
			}
		}

		frag.getElementById('payment-id').value = id;

		if (requestShipping) {
			if (Array.isArray(shippingOptions)) {
				const shippingOptTemplate = frag.getElementById('shipping-option-template').content;
				await Promise.all(shippingOptions.map(async ({ label, id, selected, amount: { value }}) => {
					const base = shippingOptTemplate.cloneNode(true);
					await Promise.allSettled([
						text('.shipping-option-label', label, { base }),
						text('.shipping-option-amount-value', value, { base }),
						attr('.shipping-option-checkbox', { id, checked: selected, value: id }, { base }),
					]);
					return base;
				})).then(opts => frag.getElementById('payment-shipping-method').append(...opts));
			} else {
				await attr('#payment-shipping-method', {
					hidden: true,
					disabled: true,
				}, { base: frag });
			}
		} else {
			await attr('#payment-shipping-address, #payment-shipping-method', {
				hidden: true,
				disabled: true,
			}, { base: frag});
		}


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

		requestAnimationFrame(async () => {
			const style = await loadStylesheet(new URL('./components/payment/request.css', meta.url), { parent: shadow });
			shadow.append(frag);
			const styles = query('link[rel="stylesheet"]', shadow).filter(link => !link.isSameNode(style));
			await Promise.all(styles.map(link => when(link, 'load')));
			this.dispatchEvent(new Event('ready'));
		});
	}

	disconnectedCallback() {
		if (protectedData.has(this)) {
			protectedData.delete(this);
		}
	}

	get ready() {
		if (getData(this, 'shadow').childElementCount === 0) {
			return new Promise(r => this.addEventListener('ready', () => r(), { once: true }));
		} else {
			return Promise.resolve();
		}
	}

	async canMakePayment() {
		const methodData = getData(this, 'methodData');

		if (! Array.isArray(methodData)) {
			return false;
		} else {
			const card = methodData.find(({ supportedMethods }) => supportedMethods === 'basic-card');

			if (typeof card === 'undefined') {
				return false;
			} else if (! ('data' in card)) {
				return false;
			} else if (! ('supportedNetworks' in card.data)) {
				return false;
			} else if (
				! Array.isArray(card.data.supportedNetworks) ||
				card.data.supportedNetworks.length === 0
			) {
				return false;
			} else {
				const networks = Object.keys(HTMLPaymentRequestElement.supportedCardNetworks);
				return card.data.supportedNetworks.every(type => networks.includes(type));
			}
		}
	}

	// @SEE https://developer.mozilla.org/en-US/docs/Web/API/PaymentRequest/show
	async show() {
		if (! (this.parentElement instanceof Element)) {
			document.body.append(this);
		}

		const { promise, shadow } = protectedData.get(this);
		await this.ready;
		const dialog = shadow.getElementById('payment-request-dialog');
		const backdrop = shadow.getElementById('payment-request-backdrop');

		requestAnimationFrame(() => {
			animate(dialog, [{
				opacity: 0,
				transform: 'scale(0)',
			}, {
				opacity: 1,
				transform: 'none',
			}], {
				duration: 400,
			});

			animate(backdrop, [{
				opacity: 0,
			}, {
				opacity: 1
			}], {
				duration: 400,
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

		reject('Aborted');

		getData(this).reject(new DOMException('PaymentRequest aborted'));
		this.remove();
	}

	/**
	 * @SEE https://www.w3.org/Payments/card-network-ids
	 */
	static get supportedCardNetworks() {
		return {
			'amex': 'American Express',
			'cartebancaire': 'Cartes Bancaires',
			'diners': 'Diners Club International',
			'discover': 'Discover',
			'jcb': 'Japan Credit Bureau',
			'mastercard': 'Mastercard',
			'mir': 'Mir',
			'paypak': 'PayPak',
			'troy': 'Troy',
			'unionpay': 'UnionPay',
			'visa': 'Visa',
		};
	}
}

registerCustomElement('payment-request', HTMLPaymentRequestElement);
