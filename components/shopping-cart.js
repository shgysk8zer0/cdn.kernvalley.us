import { ShoppingCart, version } from '../js/std-js/ShoppingCart.js';
import { registerCustomElement } from '../js/std-js/custom-elements.js';
import { create, query, text } from '../js/std-js/dom.js';
import { save } from '../js/std-js/filesystem.js';
import './checkout-button.js';

const protectedData = new WeakMap();

const styles = {
	container: {
		'color': 'inherit',
		'background-color': 'inherit',
		'box-sizing': 'border-box',
		'font-size': '18px',
		'max-width': '95vw',
		'max-height': '100%',
		'width': '600px',
	},
	header: {
		'display': 'flex',
		'flex-direction': 'row',
		'justify-content': 'space-evenly',
		'padding': '8px',
		'gap': '8px',
	},
	row: {
		'display': 'flex',
		'flex-direction': 'row',
		'justify-content': 'space-evenly',
		'padding': '8px',
		'gap': '8px',
	},
	cells: {
		'flex-basis': '25%',
		'flex-grow': '1',
		'flex-shrink': '0',
		'cursor': 'cell',
		'padding': '0.2em',
		'box-sizing': 'border-box',
	},
};

registerCustomElement('shopping-cart', class HTMLShoppingCartElement extends HTMLElement {
	constructor() {
		super();
		protectedData.set(this, { shadow: this.attachShadow({ mode: 'open' }) });
	}

	connectedCallback() {
		this.update().catch(console.error);
	}

	get store() {
		if (this.hasAttribute('store')) {
			return this.getAttribute('store');
		} else {
			return 'shopping';
		}
	}

	set store(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('store', val);
		}
	}

	get version() {
		return parseInt(this.getAttribute('version')) || version;
	}

	set version(val) {
		if (Number.isInteger(val) && val > 0) {
			this.setAttribute('version', val.toString());
		} else {
			this.removeAttribute('version');
		}
	}

	async update({ store, version } = this) {
		const cart = new ShoppingCart(store, version);
		const { shadow } = protectedData.get(this);
		const items = await cart.items;
		const total = items.reduce((sum, { price, quantity }) => sum + price * quantity, 0);

		async function updateTotal(container) {
			const prices = query('[data-field="price"]', container).map(el => {
				return parseFloat(el.textContent);
			});

			const total = prices.reduce((sum, price) => sum + price, 0);

			await text(query('.product-total', container), total.toFixed(2));
		}

		const container = create('div', {
			part: ['product-container'],
			classList: ['cart-list'],
			styles: styles.container,
			children: [
				create('header', {
					part: ['header'],
					styles: styles.header,
					children: [
						create('b', { text: 'Name', styles: styles.cells}),
						create('b', { text: 'Quantity', styles: styles.cells }),
						create('b', { text: 'Total', styles: styles.cells }),
						create('b', { text: 'Delete', styles: styles.cells }),
					]
				})
			]
		});

		items.forEach(({ name, uuid, price, quantity }, i) => {
			const even = i % 2 === 0;

			container.append(create('div', {
				classList: even ? ['row', 'row-even'] : ['row', 'row-odd'],
				dataset: { uuid },
				part: ['row'],
				styles: styles.row,
				children: [
					create('span', {
						text: name,
						dataset: { field: 'name' },
						part: ['product-name', 'cell'],
						styles: styles.cells,
					}),
					create('span', {
						text: quantity.toString(),
						dataset: { field: 'quantity', uuid, cost: price },
						part: ['product-quantity', 'cell'],
						attrs: { contenteditable: true, tabindex: '0' },
						classList: ['inline-block'],
						styles: { ...styles.cells,
							border: '1px solid currentColor',
							'border-radius': '4px',
							'cursor': 'text',
						},
						events: {
							input: ({ target }) => {
								const quantity = parseInt(target.textContent.replace(/\D/g, ''));

								if (! Number.isNaN(quantity) && quantity >= 0) {
									const cost = parseFloat(target.dataset.cost);

									cart.updateItem(target.dataset.uuid, { quantity }).then(async () => {
										await text(
											query('[data-field="price"]', target.closest('.row')),
											(cost * quantity).toFixed(2),
										);
										await updateTotal(target.closest('.cart-list'));
									}).catch(err => {
										console.error(err);
										alert(err);
									});
								}
							}
						}
					}),
					create('span', {
						text: '$',
						styles: styles.cells ,
						part: ['cell'],
						children: [
							create('span', {
								text: (price * quantity).toFixed(2),
								dataset: { field: 'price' },
								part: ['product-price'],
							})
						],
					}),
					create('span', {
						styles: { ...styles.cells, 'display': 'inline-flex' },
						part: ['cell'],
						children: [
							create('span', { styles: { 'flex-grow': '1' }}),
							create('button', {
								text: 'X',
								dataset: { uuid, productName: name },
								classList: ['delete-btn'],
								part: ['delete-row-btn'],
								attrs: { type: 'button' },
								styles: {
									'background-color': '#dc3545',
									'color': '#fafafa',
									'border': 'none',
									'border-radius': '6px',
									'cursor': 'pointer',
									'font-size': '16px',
									'padding': '8px',
									'margin-left': 'auto',
								},
								events: {
									click: ({ target }) => {
										const el = target.closest('.delete-btn');

										if (confirm(`Remove ${el.dataset.productName} from cart?`)) {
											requestAnimationFrame(() => {
												cart.deleteItem(el.dataset.uuid).then(async () => {
													const container = target.closest('.cart-list');
													target.closest('.row').remove();
													await updateTotal(container);
												}).catch(err => {
													console.error(err);
													alert(err);
												});
											});
										}
									}
								}
							})

						]
					})
				]
			}));
		});

		container.append(create('footer', {
			part: 'footer',
			children: [
				create('b', { text: 'Total' }),
				create('span', { text: ' ', classList: ['spacer'] }),
				create('slot', { text: '$', attrs: { name: 'currency-symbol' }}),
				create('span', { text: total.toFixed(2), part: ['total'], classList: ['product-total'] }),
				document.createElement('br'),
				create('slot', { attrs: { name: 'note' }}),
				document.createElement('hr'),
				create('span', { text: ' ' }),
				create('button', {
					is: 'checkout-button',
					part: ['checkout-btn', 'btn'],
					classList: ['btn', 'checkout-btn'],
					hidden: true,
					children: [
						create('slot', { name: 'checkout-label', text: 'Checkout' }),
						create('slot', { name: 'checkout-icon' }),
					],
					styles: {
						'background-color': '#007bff',
						'color': '#fafafa',
						'border': 'none',
						'border-radius': '6px',
						'cursor': 'pointer',
						'font-size': '18px',
						'font-weight': 'bold',
						'padding': '12px 16px',
					},
					events: {
						pay: async ({ detail: request }) => {
							try {
								const resp = await request.show();
								resp.complete('success');

								import('./notification/html-notification.js').then(async ({ HTMLNotificationElement }) => {
									new HTMLNotificationElement('Payment Response', {
										body: 'No data is sent. What would you like to do now?',
										requireInteraction: true,
										vibrate: [200, 0, 200],
										actions: [{
											title: 'Show me',
											action: 'dialog',
										}, {
											title: 'Save JSON',
											action: 'save',
										}, {
											title: 'Dismiss',
											action: 'dismiss',
										}],
										data: JSON.stringify(resp, null, 4)
									}).addEventListener('notificationclick', ({ target, action }) => {
										switch(action) {
											case 'dialog':
												Promise.resolve(target.data).then(json => {
													const dialog = create('dialog', {
														children: [
															create('pre', {
																children: [
																	create('code', { text: json }),
																]
															})
														],
														events: {
															click: ({ target }) => target.closest('dialog').close(),
															close: ({ target }) => target.remove(),
														}
													});
													document.body.append(dialog);
													dialog.showModal();
												}).catch(console.error);
												break;

											case 'save':
												save(new File([target.data], 'Response.json', { type: 'application/json' }));
												break;

											case 'dismiss':
												target.close();
												break;
										}
									});
								});
							} catch(err) {
								console.error(err);
							}

						}
					}
				}),
				create('span', { part: 'spacer' }),
				create('button', {
					attrs: { type: 'button' },
					part: ['clear-btn', 'btn'],
					children: [
						create('slot', { name: 'empty-label', text: 'Empty Cart' }),
						create('slot', { name: 'empty-icon' }),
					],
					styles: {
						'background-color': '#dc3545',
						'color': '#fafafa',
						'border': 'none',
						'border-radius': '6px',
						'cursor': 'pointer',
						'font-size': '18px',
						'font-weight': 'bold',
						'padding': '12px 16px',
					},
					events: {
						click: ({ target }) => {
							if (confirm('Are you sure you want to remove all items from your cart?')) {
								cart.emptyCart().then(() => {
									requestAnimationFrame(() => {
										const container = target.closest('.cart-list');
										query('.row', container).forEach(el => el.remove());
										updateTotal(container);
									});
								}).catch(err => {
									console.error(err);
									alert(err);
								});
							}
						}
					},
				})
			]
		}));

		shadow.replaceChildren(container);

		customElements.whenDefined('checkout-button').then(() => {
			const btn = shadow.querySelector('.checkout-btn');
			const { requestPayerName, requestPayerEmail, requestPayerPhone,
				shippingOptions, shippingType } = this;

			requestAnimationFrame(() => {
				btn.requestPayerName = requestPayerName;
				btn.requestPayerEmail = requestPayerEmail;
				btn.requestPayerPhone = requestPayerPhone;
				btn.shippingOptions = shippingOptions;
				btn.shippingType = shippingType;
				btn.hidden = false;
				btn.disabled = false;
			});
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
});
