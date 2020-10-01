import HTMLCustomElement from '../custom-element.js';

function openLink() {
	window.open(this.url, 'ad-window', 'noopener,noreferrer');
	this.dispatchEvent(new Event('opened'));
}

const observer = ('IntersectionObserver' in window) ? new IntersectionObserver((entries, observer) => {
	entries.forEach(({ isIntersecting, target }) => {
		if (isIntersecting) {
			observer.unobserve(target);
			target.dispatchEvent(new Event('show'));
		}
	});
}, {
	threshold: [0.7],
}) : {
	observe: () => null,
	unobserve: () => null,
};

HTMLCustomElement.register('ad-block', class HTMLAdBlockElement extends HTMLCustomElement {
	constructor({
		callToAction = null,
		description  = null,
		label        = null,
		image        = null,
		url          = null,
		theme        = null,
	} = {}) {
		super();
		this.attachShadow({ mode: 'open' });

		this.getTemplate('./components/ad/block.html').then(tmp => {
			tmp.querySelectorAll('slot[name]').forEach(el => {
				if (['label', 'description', 'image'].includes(el.name)) {
					el.addEventListener('slotchange', ({ target }) => {
						target.assignedElements().forEach(el => {
							switch(target.name) {
								case 'label':
									el.setAttribute('itemprop', 'name');
									break;

								case 'description':
									el.setAttribute('itemprop', 'description');
									break;

								case 'image':
									el.setAttribute('itemprop', 'image');
									break;
							}
						});
					});
				}
			});

			this.shadowRoot.append(tmp);
			this.dispatchEvent(new Event('ready'));
		});

		if (typeof callToAction === 'string' || callToAction instanceof HTMLElement) {
			this.callToAction = callToAction;
		}

		if (typeof label === 'string' || label instanceof HTMLElement) {
			this.label = label;
		}

		if (typeof description === 'string' || description instanceof HTMLElement) {
			this.description = description;
		}

		if (typeof image === 'string' || image instanceof HTMLElement || image instanceof URL) {
			this.image = image;
		}

		this.whenConnected.then(() => {
			if (typeof url === 'string' || url instanceof URL) {
				this.url = url;
			}

			if (typeof theme === 'string') {
				this.theme = theme;
			}
		});
	}

	connectedCallback() {
		this.dispatchEvent(new Event('connected'));
		this.ready.then(() => {
			observer.observe(this);
		});
		this.setAttribute('itemtype', 'https://schema.org/WPAdBlock');
		this.setAttribute('itemscope', '');
	}

	disconnectedCallback() {
		observer.unobserve(this);
	}

	attributeChangedCallback(name, oldVal, newVal) {
		switch(name) {
			case 'url':
				if (typeof newVal === 'string') {
					this.addEventListener('click', openLink, { capture: true, passive: true });
					const meta = document.createElement('meta');
					const current = this.querySelector('meta[itemprop="url"].ad-url');
					meta.classList.add('ad-url');
					meta.setAttribute('itemprop', 'url');
					meta.content = newVal;

					if (current instanceof HTMLElement) {
						current.replaceWith(meta);
					} else {
						this.append(meta);
					}
				} else {
					this.removeEventListener('click', openLink, { capture: true, passive: true });
					this.querySelectorAll('meta[itemprop="url"].ad-url').forEach(el => el.remove());
				}
				break;

			case 'height':
				this.ready.then(() => {
					const container = this.shadowRoot.getElementById('container');

					if (typeof newVal === 'string' && newVal.length !== 0) {
						container.style.setProperty('--ad-block-height', newVal);
					} else {
						container.style.removeProperty('--ad-block-height');
					}
				});
				break;

			case 'width':
				this.ready.then(() => {
					const container = this.shadowRoot.getElementById('container');

					if (typeof newVal === 'string' && newVal.length !== 0) {
						container.style.setProperty('--ad-block-width', newVal);
					} else {
						container.style.removeProperty('--ad-block-width');
					}
				});
				break;

			default:
				throw new Error(`Unhandled attribute changed: ${name}`);
		}
	}

	get callToAction() {
		return this.getSlot('calltoaction').then(el => {
			if (el instanceof HTMLElement) {
				return el.textContent;
			} else {
				return null;
			}
		});
	}

	set callToAction(val) {
		this.setSlot('calltoaction', val);
	}

	get description() {
		return this.getSlot('description').then(el => {
			if (el instanceof HTMLElement) {
				return el.textContent;
			} else {
				return null;
			}
		});
	}

	set description(val) {
		this.setSlot('description', val);
	}

	get height() {
		return this.getAttribute('height');
	}

	set height(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('height', val);
		} else if (typeof val === 'number') {
			this.setAttribute('height', `${val}px`);
		} else {
			this.removeAttribute('height');
		}
	}

	get image() {
		return this.getSlot('image');
	}

	set image(val) {
		if (typeof val === 'string' || val instanceof URL) {
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.referrerPolicy = 'no-referrer';
			img.decoding = 'async';
			img.referrerPolicy = 'no-referrer';
			img.src = val;
			img.alt = '';
			this.image = img;
		} else if (val instanceof HTMLElement) {
			this.setSlot('image', val);
		} else {
			this.clearSlot('image');
		}
	}

	get label() {
		return this.getSlot('label').then(el => {
			if (el instanceof HTMLElement) {
				return el.textContent;
			} else {
				return null;
			}
		});
	}

	set label(val) {
		this.setSlot('label', val);
	}

	get theme() {
		return this.getAttribute('theme') || 'auto';
	}

	set theme(val) {
		if (typeof val === 'string') {
			this.setAttribute('theme', val);
		} else {
			this.removeAttribute('theme');
		}
	}

	get url() {
		return this.getAttribute('url');
	}

	set url(val) {
		if (typeof val === 'string' || val instanceof URL) {
			this.setAttribute('url', val);
		} else {
			this.removeAttribute('url');
		}
	}

	get width() {
		return this.getAttribute('width');
	}

	set width(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('width', val);
		} else if (typeof val === 'number') {
			this.setAttribute('width', `${val}px`);
		}  else {
			this.removeAttribute('width');
		}
	}

	static get observedAttributes() {
		return [
			'height',
			'url',
			'width',
		];
	}
});
