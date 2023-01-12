import { loadScript, loadStylesheet } from '../../js/std-js/loader.js';
import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { create, text } from '../../js/std-js/dom.js';
import { getURL, setURL, getBool, setBool, getString, setString } from '../../js/std-js/attrs.js';
import { getURLResolver } from '../../js/std-js/utility.js';
import { createSVG, createPath } from '../../js/std-js/svg.js';
import { meta } from '../../import.meta.js';

const VERSION = '/v3/';
const protectedData = new WeakMap();
const resolveURL = getURLResolver({ base : meta.url, path: '/components/stripe/' });
const ERROR_DURATION = 5000;
const loadStripe = (async () => {
	await loadScript(new URL(VERSION, 'https://js.stripe.com/'));

	if ('Stripe' in globalThis) {
		return globalThis.Stripe;
	} else {
		throw new Error('Error loading Stripe');
	}
}).once();

const getStripeInstance = (async key => {
	const Stripe = await loadStripe();
	return Stripe(key);
}).once();

export class HTMLStripePaymentFormElement extends HTMLElement {
	constructor(key, clientSecret, {
		billing = false,
		shipping = true,
		theme = 'stripe',
		returnURL = './',
		layout = 'tabs',
		phone = true,
		allowPOBoxes = true,
		allowedCountries = [],
	} = {}) {
		super();

		if (typeof key !== 'string') {
			throw new TypeError('`key` expected to be a string');
		} else if (typeof clientSecret !== 'string') {
			throw new TypeError('`clientSecret` expected to be a string.');
		}

		setTimeout(() => {
			this.billing = billing;
			this.shipping = shipping;
			this.theme = theme;
			this.returnURL = returnURL;
			this.layout = layout;
			this.allowPOBoxes = allowPOBoxes;
			this.allowedCountries = allowedCountries;
			this.phone = phone;
		}, 10);

		const shadow = this.attachShadow({ mode: 'closed' });
		protectedData.set(this, { shadow, key, clientSecret });
	}

	async connectedCallback() {
		await new Promise(resolve => setTimeout(resolve, 10));
		const { shadow, clientSecret } = protectedData.get(this);

		const [stripe] = await Promise.all([
			this.getStripeInstance(),
			loadStylesheet(resolveURL('/css/core-css/forms.css'), {
				parent: shadow,
			}),
			loadStylesheet(resolveURL('./payment-form.css'), {
				parent: shadow,
			})
		]);

		const { billing, shipping, theme, layout } = this;

		const elements = stripe.elements({
			appearance: { theme },
			clientSecret,
		});

		const form = create('form', {
			events: {
				submit: async event => {
					event.preventDefault();
					const target = event.target;
					await new Promise((resolve, reject) => {
						target.querySelector('button[type="submit"]').disabled = true;
						const data = new FormData(event.target);

						stripe.confirmPayment({
							elements,
							confirmParams: {
								return_url: this.returnURL,
								receipt_email: data.get('email'),
							},
						}).then(({ error }) => {
							if (typeof error === 'object' && ! Object.is(error, null)) {
								const { shadow } = protectedData.get(this);
								console.error(error);

								text('[part~="error"]', error.message, { base: shadow });
								reject(error);
								this.dispatchEvent(new CustomEvent('error', { detail: error }));

								setTimeout(() => {
									text('[part~="error"]', '', { base: shadow });
								}, ERROR_DURATION);
							} else {
								resolve();
							}
						});
					}).finally(() => {
						target.querySelector('button[type="submit"]').disabled = false;
					});
				}
			},
			part: ['form'],
			children: [
				create('section', {
					part: ['cart'],
					children: [
						create('details', {
							part: ['cart'],
							children: [
								create('summary', {
									classList: ['cursor-pointer'],
									children: [
										create('slot', {
											name: 'cart-summary',
											children: [
												createSVG({
													fill: 'currentColor',
													height: 18,
													width: 18,
													viewBox: [0, 0, 48, 48],
													classList: ['icon'],
													children: [
														createPath('M14 36c-2.21 0-3.98 1.79-3.98 4s1.77 4 3.98 4 4-1.79 4-4-1.79-4-4-4zM2 4v4h4l7.19 15.17-2.7 4.9c-.31.58-.49 1.23-.49 1.93 0 2.21 1.79 4 4 4h24v-4H14.85c-.28 0-.5-.22-.5-.5 0-.09.02-.17.06-.24L16.2 26h14.9c1.5 0 2.81-.83 3.5-2.06l7.15-12.98c.16-.28.25-.61.25-.96 0-1.11-.9-2-2-2H10.43l-1.9-4H2zm32 32c-2.21 0-3.98 1.79-3.98 4s1.77 4 3.98 4 4-1.79 4-4-1.79-4-4-4z'),
													]
												}),
												create('b', { text: ' Items in Cart' }),
											],
										}),
									],
								}),
								create('slot', {
									name: 'cart',
									children: [
										create('div', { text: 'No Items in cart.' }),
									]
								}),
							]
						}),
						document.createElement('hr'),
						create('div', {
							children: [
								create('b', { text: 'Total' }),
								create('span', { text: ' ' }),
								create('slot', { name: 'currency', text: '$' }),
								create('slot', { name: 'total', text: '0.00' }),
							]
						})
					]
				}),
				create('fieldset', {
					part: ['contact-section'],
					classList: ['no-border'],
					children: [
						create('legend', {
							children: [
								create('slot', { text: 'Contact Info', slot: 'contact' }),
							]
						}),
						create('div', {
							classList: ['form-group'],
							part: ['contact'],
							children: [
								create('label', {
									for: 'stripe-user-name',
									classList: ['input-label', 'required'],
									text: 'Name',
								}),
								create('input', {
									type: 'text',
									name: 'name',
									id: 'stripe-user-name',
									required: true,
									placeholder: 'Full Name',
									autocomplete: 'name',
									classList: ['input'],
								})
							]
						}),
						create('div', {
							classList: ['form-group'],
							part: ['email'],
							children: [
								create('label', {
									for: 'stripe-email',
									classList: ['input-label', 'required'],
									text: 'Email',
								}),
								create('input', {
									type: 'email',
									name: 'email',
									id: 'stripe-email',
									required: true,
									placeholder: 'user@example.com',
									autocomplete: 'email',
									classList: ['input'],
								})
							]
						}),
					]
				}),
				create('fieldset', {
					part: ['payment-section'],
					classList: ['no-border'],
					children: [
						create('legend', {
							part: ['label', 'card-label'],
							children: [
								create('slot', {
									name: 'card-label',
									text: 'Card Details',
								})
							]
						}),
						create('slot', { name: 'stripe-payment' }),
					],
				}),
				create('fieldset', {
					hidden: true,
					part: ['billing-section'],
					classList: ['no-border'],
					children: [
						create('legend', {
							part: ['legend','billing-legend'],
							children: [
								create('slot', {
									name: 'billing-legend',
									text: 'Billing Info',
								})
							]
						}),
						create('slot', { name: 'stripe-billing' }),
					],
				}),
				create('fieldset', {
					hidden: true,
					part: ['shipping-section'],
					classList: ['no-border'],
					children: [
						create('legend', {
							part: ['legend','shipping-legend'],
							children: [
								create('slot', {
									name: 'shipping-legend',
									text: 'Shipping Info',
								})
							]
						}),
						create('slot', { name: 'stripe-shipping' }),
					],
				}),
				create('div', {
					classList: ['flex', 'row', 'space-around'],
					children:[
						create('button', {
							type: 'submit',
							part: ['submit'],
							classList: ['btn', 'btn-accept'],
							children: [
								create('slot', {
									name: 'submit',
									text: 'Submit',
								})
							]
						})
					]
				}),
				create('div', {
					classList: ['status-box', 'error'],
					part: ['error'],
				}),
			]
		});

		shadow.append(create('slot', { name: 'header' }), form, create('slot', { name: 'footer' }));

		/* Stripe elements cannot exist in ShadowDOM */
		this.append(create('div', { slot: 'stripe-payment', id: 'payment-element' }));

		elements.create('payment', {
			layout: { type: layout },
		}).mount('#payment-element');

		if (shipping) {
			shadow.querySelector('[part~="shipping-section"]').hidden = false;
			this.append(create('div', { slot: 'stripe-shipping', id: 'shipping-element' }));

			elements.create('address', {
				mode: 'shipping',
				allowedCountries: this.allowedCountries,
				blockPoBoxes: !this.allowPOBoxes,
				fields: {
					phone: this.phone ? 'always' : 'never',
				},
				validation: {
					phone: { required: this.phone ? 'always' : 'never' },
				},
			}).mount('#shipping-element');
		} else if (billing) {
			shadow.querySelector('[part~="billing-section"]').hidden = false;
			this.append(create('div', { slot: 'stripe-billing', id: 'billing-element' }));

			elements.create('address', {
				mode: 'billing',
				allowedCountries: this.allowedCountries,
				fields: {
					phone: this.phone ? 'always' : 'never',
				},
				validation: {
					phone: { required: this.phone ? 'always' : 'never' },
				}
			}).mount('#billing-element');
		}
	}

	get allowPOBox() {
		return getBool(this, 'allowpobox');
	}

	set allowPOBox(val) {
		setBool(this, 'allowpobox', val);
	}

	get allowedCountries() {
		return getString(this, 'allowedcountries', { fallback: '' }).split(' ');
	}

	set allowedCountries(val) {
		if (Array.isArray(val) && val.length !== 0) {
			setString(this, 'allowedcountries', val.join(' '));
		} else {
			this.removeAttriute('allowedcountries');
		}
	}

	get phone() {
		return getBool(this, 'phone');
	}

	set phone(val) {
		setBool(this, 'phone', val);
	}

	get billing() {
		return getBool(this, 'billing');
	}

	set billing(val) {
		setBool(this, 'billing', val);
	}

	get shipping() {
		return getBool(this, 'shipping');
	}

	set shipping(val) {
		setBool(this, 'shipping', val);
	}

	get layout() {
		return getString(this, 'layout', { fallback: 'tabs' });
	}

	set layout(val) {
		setString(this, 'layout', val);
	}

	get returnURL() {
		return (getURL(this, 'returnurl', { base: location.href }) || new URL(location.pathname, location.origin)).href;
	}

	set returnURL(val) {
		setURL(this, 'returnurl', val, { base: location.href });
	}

	get theme() {
		return getString(this, 'theme', { fallback: 'stripe' });
	}

	set theme(val) {
		setString(this, 'theme', val);
	}

	async getStripeInstance() {
		const { key } = protectedData.get(this);
		return getStripeInstance(key);
	}

	static async loadScript() {
		await loadStripe();
	}

	static define(tag = 'stripe-payment-form') {
		registerCustomElement(tag, this);
	}

	static getTotal(items) {
		if (! Array.isArray(items) || items.length === 0) {
			return 0;
		} else {
			return items.reduce((total, { price, quantity = 1 }) => total + (price * quantity), 0);
		}
	}
}
