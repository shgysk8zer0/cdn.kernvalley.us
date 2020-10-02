import HTMLCustomElement from '../custom-element.js';

function openLink() {
	const url = this.url;

	if (typeof url !== 'string') {
		throw new Error('No URL');
	} else if (new URL(url, document.baseURI).origin === location.origin) {
		this.dispatchEvent(new Event('opened'));
		setTimeout(() => location.href = url, 20);
	} else {
		window.open(this.url, 'ad-window', 'noopener,noreferrer');
		this.dispatchEvent(new Event('opened'));
	}
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
		callToAction  = null,
		description   = null,
		height        = null,
		image         = null,
		imageFit      = null,
		imagePosition = null,
		label         = null,
		layout        = null,
		theme         = null,
		url           = null,
		width         = null,
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
			if (typeof layout === 'string') {
				this.layout = layout;
			}

			if (typeof url === 'string' || url instanceof URL) {
				this.url = url;
			}

			if (typeof theme === 'string') {
				this.theme = theme;
			}

			if (typeof imageFit === 'string') {
				this.imageFit = imageFit;
			}

			if (typeof imagePosition === 'string') {
				this.imagePosition = imagePosition;
			}

			if (typeof height === 'string' || (typeof height === 'number' && ! Number.isNaN(height))) {
				this.height = height;
			}

			if (typeof width === 'string' || (typeof width === 'number' && ! Number.isNaN(height))) {
				this.width = width;
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
						container.style.setProperty('--ad-block-stack-height', newVal);
						container.style.setProperty('--ad-block-text-height', newVal);
					} else {
						container.style.removeProperty('--ad-block-height');
						container.style.removeProperty('--ad-block-stack-height');
						container.style.removeProperty('--ad-block-text-height');
					}
				});
				break;

			case 'width':
				this.ready.then(() => {
					const container = this.shadowRoot.getElementById('container');

					if (typeof newVal === 'string' && newVal.length !== 0) {
						container.style.setProperty('--ad-block-width', newVal);
						container.style.setProperty('--ad-block-stack-width', newVal);
						container.style.setProperty('--ad-block-text-width', newVal);
					} else {
						container.style.removeProperty('--ad-block-width');
						container.style.removeProperty('--ad-block-stack-width');
						container.style.removeProperty('--ad-block-text-width');
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

	get imageFit() {
		return this.getAttribute('imagefit');
	}

	set imageFit(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('imagefit', val);
		} else {
			this.removeAttribute('imagefit');
		}
	}

	get imagePosition() {
		return this.getAttribute('imageposition');
	}

	set imagePosition(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('imageposition', val);
		} else {
			this.removeAttribute('imageposition');
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

	get layout() {
		return this.getAttribute('layout') || 'default';
	}

	set layout(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('layout', val);
		} else {
			this.removeAttribute('layout');
		}
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

window.HTMLAdBlockElement = customElements.get('ad-block');
