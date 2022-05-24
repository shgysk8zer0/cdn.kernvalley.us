import { registerCustomElement } from '../js/std-js/custom-elements.js';
import { create } from '../js/std-js/dom.js';

const protectedData = new WeakMap();

registerCustomElement('cache-list', class HTMLCacheListElement extends HTMLElement {
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });
		protectedData.set(this, { shadow });

		caches.keys().then(keys => {
			shadow.append(create('form', {
				part: ['form'],
				events: {
					submit: event => {
						event.preventDefault();
						const data = new FormData(event.target);
						this.version = data.get('version');
					}
				},
				children: [
					create('label', { for: 'cache-versions', text: 'Cache Version' }),
					create('select', {
						name: 'version',
						id: 'cache-versions',
						required: true,
						part: ['version-select'],
						children: keys.map(key => create('option', { value: key, text: key })),
					}),
					create('div', {
						children: [
							create('button', { type: 'submit', text: 'List', part: ['submit', 'button'] }),
							create('button', { type: 'reset', text: 'Reset', part: ['reset', 'button'] }),
						]
					})
				]
			}), create('table', {
				part: ['table'],
				children: [
					create('thead', {
						hidden: true,
						children: [create('tr', {
							children: ['Index', 'Method', 'Protocol', 'Host', 'Path', 'Actions']
								.map(text => create('th', { text })),
						})]
					}),
					create('tbody'),
				]
			}));
		});
	}

	attributeChangedCallback(name, oldVal, newVal) {
		switch(name) {
			case 'version':
				if (typeof newVal === 'string' && newVal.length !== 0) {
					caches.open(newVal).then(cache => {
						cache.keys().then(items => {
							const { shadow } = protectedData.get(this);
							const trs = items.map(({ method, url }, i) => {
								const { protocol, host, pathname } = new URL(url);
								return create('tr', {
									dataset: { key: url },
									part: ['row', i % 2 === 0 ? 'row-even' : 'row-odd'],
									children: [
										create('td', { text: i.toString(), part: ['index'] }),
										...[method, protocol, host, pathname]
											.map(text => create('td', { text })),
										create('td', {
											children: [create('button', {
												type: 'button',
												text: 'Delete',
												dataset: { url },
												part: ['delete', 'button'],
												events: {
													click: async ({ target}) => {
														const cache = await caches.open(newVal);
														await cache.delete(target.dataset.url);
														target.closest('tr').remove();
													}
												}
											})]
										})
									]
								});
							});

							shadow.querySelector('table > tbody').replaceChildren(...trs);
							shadow.querySelector('table > thead').hidden = trs.length === 0;
						});
					});
				}
				break;

			default:
				throw new DOMException(`Unsupported attribtue changed: "${name}"`);
		}
	}

	get version() {
		return this.getAttribute('version');
	}

	set version(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('version', val);
		} else {
			this.removeAttribute('version');
		}
	}

	static get observedAttributes() {
		return ['version'];
	}
});
