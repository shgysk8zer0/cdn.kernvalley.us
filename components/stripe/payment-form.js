import { loadStylesheet } from '../../js/std-js/loader.js';
import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { create, text } from '../../js/std-js/dom.js';
import { getURL, setURL, getBool, setBool, getString, setString } from '../../js/std-js/attrs.js';
import { getURLResolver, debounce } from '../../js/std-js/utility.js';
import { createSVG, createPath } from '../../js/std-js/svg.js';
import { meta } from '../../import.meta.js';
import { getStripeInstance, loadStripe, getCurrencySymbol } from './utils.js';

const protectedData = new WeakMap();
const resolveURL = getURLResolver({ base : meta.url, path: '/components/stripe/' });
const ERROR_DURATION = 5000;

function getSlot(name, shadow) {
	return shadow.querySelector(`slot[name="${name}"]`);
}

function getSlotted(name, shadow) {
	const slot = getSlot(name, shadow);

	if (slot instanceof HTMLSlotElement) {
		return slot.assignedElements();
	} else {
		return [];
	}
}

function clearSlot(name, shadow) {
	getSlotted(name, shadow).forEach(el => el.remove());
}

export class HTMLStripePaymentFormElement extends HTMLElement {
	constructor(key, clientSecret, {
		details: {
			displayItems = [],
			modifiers: {
				additionalDisplayItems = [],
			} = {},
			// total = 0,
		},
		options: {
			requestShipping = true,
			requestPayerPhone = true,

		} = {},
		config: {
			theme = 'auto',
			returnURL = './',
			layout = 'tabs',
			allowPOBoxes = true,
			allowedCountries = ['US'],
		} = {},
	} = {}) {
		super();

		if (typeof theme !== 'string' || theme === 'auto') {
			theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'stripe';
		}

		if (typeof key !== 'string') {
			throw new TypeError('`key` expected to be a string');
		} else if (typeof clientSecret !== 'string') {
			throw new TypeError('`clientSecret` expected to be a string.');
		}

		setTimeout(() => {
			this.requestShipping = requestShipping;
			this.theme = theme;
			this.returnURL = returnURL;
			this.layout = layout;
			this.allowPOBoxes = allowPOBoxes;
			this.allowedCountries = allowedCountries;
			this.requestPayerPhone = requestPayerPhone;

			if (Array.isArray(displayItems)) {
				this.displayItems = displayItems;
			}

			if (Array.isArray(additionalDisplayItems)) {
				this.additionalDisplayItems = additionalDisplayItems;
			}
		}, 10);

		const shadow = this.attachShadow({ mode: 'closed' });
		protectedData.set(this, { shadow, key, clientSecret });
	}

	async connectedCallback() {
		await new Promise(resolve => setTimeout(resolve, 10));
		const { shadow, clientSecret } = protectedData.get(this);

		const [stripe] = await Promise.all([
			this.getStripeInstance(),
			loadStylesheet(resolveURL('./payment-form.css'), {
				parent: shadow,
			})
		]);

		const { requestShipping, theme, layout } = this;

		const elements = stripe.elements({
			appearance: { theme },
			clientSecret,
		});

		const slotchange = debounce(() => this.updateTotal());

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
					id: 'overview',
					part: ['overview'],
					children: [
						create('details', {
							// open: true,
							part: ['items-overview', 'text'],
							classList: ['accordion'],
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
								create('div', {
									part: ['display-items', 'text'],
									children: [
										create('h4', { text: 'Items' }),
										create('div', {
											id: 'display-items-container',
											children: [
												create('slot', {
													name: 'displayitems',
													events: { slotchange },
													children: [
														create('div', { text: 'No Items in cart.' }),
													]
												}),
											]
										})
									]
								}),
								create('div', {
									part: ['additional-display-items', 'text'],
									children: [
										create('h4', { text: 'Additional Items & Fees' }),
										create('div', {
											id: 'additional-display-items-container',
											children: [
												create('slot', {
													name: 'additionaldisplayitems',
													events: { slotchange },
													children: create('div', { text: 'Nothing to display.' }),
												}),
											]
										}),
									]
								}),
							]
						}),
						document.createElement('hr'),
						create('div', {
							part: ['text'],
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
							part: ['contact-legend', 'legend', 'text'],
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
									part: ['text'],
									text: 'Full name',
								}),
								create('input', {
									type: 'text',
									name: 'name',
									id: 'stripe-user-name',
									required: true,
									placeholder: 'First and last name',
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
									part: ['text'],
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
							part: ['legend', 'card-legend', 'text'],
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
					part: ['shipping-section'],
					classList: ['no-border'],
					children: [
						create('legend', {
							part: ['legend','shipping-legend', 'text'],
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

		if (requestShipping) {
			shadow.querySelector('[part~="shipping-section"]').hidden = false;
			this.append(create('div', { slot: 'stripe-shipping', id: 'shipping-element' }));

			const shipping = elements.create('address', {
				mode: 'shipping',
				allowedCountries: this.allowedCountries,
				blockPoBoxes: !this.allowPOBoxes,
				fields: {
					phone: this.requestPayerPhone ? 'always' : 'never',
				},
				validation: {
					phone: { required: this.requestPayerPhone ? 'always' : 'never' },
				},
			});
			shipping.mount('#shipping-element');

			shipping.on('change', ({ value: detail }) => {
				this.dispatchEvent(new CustomEvent('shippingaddresschange', { detail }));
			});
		}

		this.dispatchEvent(new Event('ready'));
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

	get requestPayerPhone() {
		return getBool(this, 'requestpayerphone');
	}

	set requestPayerPhone(val) {
		setBool(this, 'requestpayerphone', val);
	}

	get billing() {
		return getBool(this, 'billing');
	}

	set billing(val) {
		setBool(this, 'billing', val);
	}

	get requestShipping() {
		return getBool(this, 'requestshipping');
	}

	set requestShipping(val) {
		setBool(this, 'requestshipping', val);
	}

	get additionalDisplayItems() {
		return getSlotted('additionaldisplayitems', protectedData.get(this).shadow).map(el => ({
			label: el.querySelector('[itemprop="name"]').textContent,
			amount: {
				value: parseFloat(el.querySelector('[itemprop="price"]').textContent),
				currency: el.querySelector('[itemprop="priceCurrency"]').textContent,
			}
		}));
	}

	set additionalDisplayItems(val) {
		clearSlot('additionaldisplayitems', protectedData.get(this).shadow);
		const styles = {
			width: '180px',
			'text-overflow': 'ellipsis',
		};

		if (Array.isArray(val) && val.length !== 0) {
			this.append(...val.map(({ label, amount: { value, currency = 'USD' }}) => create('div', {
				slot: 'additionaldisplayitems',
				itemtype: 'https://schema.org/Offer',
				itemscope: true,
				classList: ['display-item'],
				children: [
					create('b', { itemprop: 'name', text: label, styles }),
					create('span', {
						children: [
							create('span', {
								itemprop: 'priceCurrency',
								content: currency,
								text: getCurrencySymbol(currency),
							}),
							create('span', { itemprop: 'price', text: value.toFixed(2) }),
						]
					}),
				]
			})));
		}
	}

	get displayItems() {
		return getSlotted('displayitems', protectedData.get(this).shadow).map(el => ({
			label: el.querySelector('[itemprop="name"]').textContent,
			amount: {
				value: parseFloat(el.querySelector('[itemprop="price"]').textContent),
				currency: el.querySelector('[itemprop="priceCurrency"]').textContent,
			}
		}));
	}

	set displayItems(val) {
		clearSlot('displayitems', protectedData.get(this).shadow);

		const styles = {
			width: '180px',
			'text-overflow': 'ellipsis',
		};

		if (Array.isArray(val) && val.length !== 0) {
			this.append(...val.map(({ label, amount: { value, currency = 'USD' }}) => create('div', {
				slot: 'displayitems',
				itemtype: 'https://schema.org/Offer',
				itemscope: true,
				classList: ['display-item'],
				children: [
					create('b', { itemprop: 'name', text: label, styles }),
					create('span', {
						children: [
							create('span', {
								itemprop: 'priceCurrency',
								content: currency,
								text: getCurrencySymbol(currency),
							}),
							create('span', { itemprop: 'price', text: value.toFixed(2) }),
						]
					}),
				]
			})));
		}
	}

	get total() {
		const slotted = getSlotted('total', protectedData.get(this).shadow);

		if (slotted.length === 1) {
			return parseFloat(slotted.textContent);
		} else {
			return 0;
		}
	}

	set total(val) {
		clearSlot('total', protectedData.get(this).shadow);

		if (typeof val === 'number' && val > 0) {
			this.append(create('span', {
				slot: 'total',
				text: val.toFixed(2),
			}));
		}
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

	updateTotal() {
		this.total = [
			...this.displayItems,
			...this.additionalDisplayItems,
		].reduce((total, { amount: { value }}) => total + value, 0);
	}

	static async loadScript() {
		await loadStripe();
	}

	static getTotal(items) {
		if (! Array.isArray(items) || items.length === 0) {
			return 0;
		} else {
			return items.reduce((total, { price, quantity = 1 }) => total + (price * quantity), 0);
		}
	}
}

registerCustomElement('stripe-payment-form', HTMLStripePaymentFormElement);
