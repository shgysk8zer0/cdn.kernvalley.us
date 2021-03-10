import { ShoppingCart } from '../js/std-js/ShoppingCart.js';
import { registerCustomElement } from '../js/std-js/custom-elements.js';
import { create, query, text } from '../js/std-js/dom.js';

const styles = {
	cells: {
		'flex-basis': '25%',
		'flex-grow': '1',
		'flex-shrink': '0',
		'cursor': 'cell',
		'height': '1.2em',
		'box-sizing': 'border-box',
	},
};

registerCustomElement('shopping-cart', class HTMLShoppingCartElement extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
	}

	async connectedCallback() {
		const cart = new ShoppingCart();
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
			styles: {
				'color': 'inherit',
				'background-color': 'inherit',
				'box-sizing': 'border-box',
				'overflow': 'auto',
				'font-size': '18px',
				'max-width': '100%',
				'max-height': '100%',
			},
			children: [
				create('header', {
					part: ['header'],
					styles: {
						'display': 'flex',
						'flex-direction': 'row',
						'justify-content': 'space-evenly',
						'padding': '8px',
						'gap': '8px',
					},
					children: [
						create('b', { text: 'Product Name', styles: styles.cells}),
						create('b', { text: 'Quantity', styles: styles.cells }),
						create('b', { text: 'Total Cost', styles: styles.cells }),
						create('b', { text: 'Delete Item', styles: styles.cells }),
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
				styles: {
					'display': 'flex',
					'flex-direction': 'row',
					'justify-content': 'space-evenly',
					'padding': '8px',
					'gap': '8px',
				},
				children: [
					create('span', {
						text: name,
						dataset: { field: 'name' },
						part: ['product-name', 'cell'],
						styles: styles.cells ,
					}),
					create('span', {
						text: quantity.toString(),
						dataset: { field: 'quantity', uuid, cost: price },
						part: ['product-quantity', 'cell'],
						attrs: { contenteditable: true, tabindex: '0' },
						styles: styles.cells ,
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
				// create('button', {
				// 	text: 'Checkout',
				// 	part: ['checkout', 'btn'],
				// 	classList: ['checkout-btn'],
				// 	is: 'checkout-btn',
				// 	styles: {
				// 		'background-color': '#2B80F0',
				// 		'color': '#fafafa',
				// 		'border': 'none',
				// 		'border-radius': '6px',
				// 		'cursor': 'pointer',
				// 		'font-size': '18px',
				// 		'font-weight': 'bold',
				// 		'padding': '12px 16px',
				// 	},
				// 	events: {
				// 		click: () => alert('Not yet supported. Sorry :('),
				// 	},
				// 	children: [
				// 		create('slot', { name: 'checkout-icon' }),
				// 	]
				// }),
				create('span', { text: ' ' }),
				create('button', {
					text: 'Empty Cart',
					attrs: { type: 'button' },
					part: ['clear-btn', 'btn'],
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
					children: [
						create('slot', { attrs: { name: 'clear-cart-icon' }}),
					]
				})
			]
		}));

		this.shadowRoot.append(container);
	}
});
