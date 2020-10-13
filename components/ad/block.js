import HTMLCustomElement from '../custom-element.js';

function keypress(event) {
	if (event.keyCode === 32) {
		openLink.apply(this);
	}
}

function openLink() {
	if (! (this instanceof HTMLAnchorElement)) {
		const url = this.url;

		if (typeof url !== 'string') {
			throw new Error('No URL');
		} else if (new URL(url, document.baseURI).origin === location.origin) {
			this.dispatchEvent(new Event('opened'));
			setTimeout(() => location.href = this.getUrl(), 20);
		} else {
			window.open(this.getUrl(), 'ad-window', 'noopener,noreferrer');
			this.dispatchEvent(new Event('opened'));
		}
	}
}

const queries = new WeakMap();

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
		background    = null,
		border        = null,
		borderWidth   = null,
		callToAction  = null,
		campaign      = null,
		color         = null,
		content       = null,
		description   = null,
		height        = null,
		image         = null,
		imageFit      = null,
		imagePosition = null,
		linkColor     = null,
		label         = null,
		layout        = null,
		media         = null,
		medium        = null,
		source        = null,
		term          = null,
		theme         = null,
		url           = null,
		width         = null,
		loading       = null,
	} = {}) {
		super();
		this.attachShadow({ mode: 'open' });
		this.lazyLoad(true);

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

		Promise.resolve().then(() => {
			this.tabIndex = 0;
			this.setAttribute('role', 'document');

			if (typeof background === 'string') {
				this.background = background;
			}

			if (typeof border === 'string') {
				this.border = border;
			}

			if (typeof borderWidth === 'string' || typeof borderWidth === 'number') {
				this.borderWidth = borderWidth;
			}

			if (typeof color === 'string') {
				this.color = color;
			}

			if (typeof linkColor === 'string') {
				this.linkColor = linkColor;
			}

			if (typeof loading === 'string') {
				this.loading = loading;
			}

			if (typeof media === 'string') {
				this.media = media;
			}

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

			if (typeof source === 'string') {
				this.source = source;
			}

			if (typeof medium === 'string') {
				this.medium = medium;
			}

			if (typeof campaign === 'string') {
				this.campaign = campaign;
			}

			if (typeof term === 'string') {
				this.term = term;
			}

			if (typeof content === 'string') {
				this.content = content;
			}

			if (typeof height === 'string' || (typeof height === 'number' && ! Number.isNaN(height))) {
				this.height = height;
			}

			if (typeof width === 'string' || (typeof width === 'number' && ! Number.isNaN(height))) {
				this.width = width;
			}
		}).then(() => {
			Promise.allSettled([
				this.whenConnected,
				this.whenLoad,
			]).then(() => {
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
											el.setAttribute('role', 'image');
											break;
									}
								});
							});
						}
					});

					this.shadowRoot.append(tmp);
					this.dispatchEvent(new Event('ready'));
				});
			});
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
			case 'background':
				this.ready.then(() => {
					const container = this.shadowRoot.getElementById('container');

					if (typeof newVal === 'string' && newVal.startsWith('#')) {
						container.style.setProperty('--ad-background', newVal);
					} else {
						container.style.removeProperty('--ad-background');
					}
				});
				break;

			case 'border':
				this.ready.then(() => {
					const container = this.shadowRoot.getElementById('container');

					if (typeof newVal === 'string' && newVal.startsWith('#')) {
						container.style.setProperty('--ad-border', newVal);
					} else {
						container.style.removeProperty('--ad-border');
					}
				});
				break;

			case 'borderwidth':
				this.ready.then(() => {
					const container = this.shadowRoot.getElementById('container');

					if (typeof newVal === 'string' && /\d$/.test(newVal)) {
						container.style.setProperty('--ad-border-width', `${newVal}px`);
					} else if (typeof newVal === 'string') {
						container.style.setProperty('--ad-border-width', newVal);
					} else {
						container.style.removeProperty('--ad-border-width');
					}
				});
				break;

			case 'color':
				this.ready.then(() => {
					const container = this.shadowRoot.getElementById('container');

					if (typeof newVal === 'string' && newVal.startsWith('#')) {
						container.style.setProperty('--ad-color', newVal);
					} else {
						container.style.removeProperty('--ad-color');
					}
				});
				break;

			case 'linkcolor':
				this.ready.then(() => {
					const container = this.shadowRoot.getElementById('container');

					if (typeof newVal === 'string' && newVal.startsWith('#')) {
						container.style.setProperty('--ad-link-color', newVal);
					} else {
						container.style.removeProperty('--ad-link-color');
					}
				});
				break;

			case 'url':
				if (typeof newVal !== 'string') {
					this.removeEventListener('click', openLink, { capture: true, passive: true });
					this.removeEventListener('keydown', keypress, { capture: true, passive: true });
					this.querySelectorAll('meta[itemprop="url"].ad-url').forEach(el => el.remove());
				} else if (newVal.length === 0) {
					this.removeAttribute('url');
				} else if (newVal.startsWith('/') || newVal.startsWith('./') || newVal.startsWith('#')) {
					this.url = new URL(newVal, document.baseURI);
				} else {
					this.addEventListener('click', openLink, { capture: true, passive: true });
					this.addEventListener('keydown', keypress, { capture: true, passive: true });
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
				}
				break;

			case 'height':
				this.ready.then(() => {
					const container = this.shadowRoot.getElementById('container');

					if (typeof newVal === 'string' && newVal.length !== 0) {
						container.style.setProperty('--ad-block-height', newVal);
						container.style.setProperty('--ad-block-stack-height', newVal);
						container.style.setProperty('--ad-block-text-height', newVal);
						container.style.setProperty('--ad-block-image-height', newVal);
						container.style.setProperty('--ad-block-full-width-height', newVal);
					} else {
						container.style.removeProperty('--ad-block-height');
						container.style.removeProperty('--ad-block-stack-height');
						container.style.removeProperty('--ad-block-text-height');
						container.style.removeProperty('--ad-block-image-height');
						container.style.removeProperty('--ad-block-full-width-height', newVal);
					}
				});
				break;

			case 'loading':
				this.lazyLoad(newVal === 'lazy');
				break;

			case 'media':
				if (typeof newVal === 'string') {
					const query = matchMedia(newVal);
					this.hidden = ! query.matches;
					const callback = ({ target }) => this.hidden = ! target.matches;

					if (queries.has(this)) {
						const { callback, query } = queries.get(this);
						query.removeEventListener('change', callback);
						queries.delete(this);
					}

					query.addEventListener('change', callback);
					queries.set(this, { callback, query });
				} else {
					if (queries.has(this)) {
						const { callback, query } = queries.get(this);
						query.removeEventListener('change', callback);
						queries.delete(this);
					}
					this.hidden = false;
				}
				break;

			case 'width':
				this.ready.then(() => {
					const container = this.shadowRoot.getElementById('container');

					if (typeof newVal === 'string' && newVal.length !== 0) {
						container.style.setProperty('--ad-block-width', newVal);
						container.style.setProperty('--ad-block-stack-width', newVal);
						container.style.setProperty('--ad-block-text-width', newVal);
						container.style.setProperty('--ad-block-image-width', newVal);
					} else {
						container.style.removeProperty('--ad-block-width');
						container.style.removeProperty('--ad-block-stack-width');
						container.style.removeProperty('--ad-block-text-width');
						container.style.removeProperty('--ad-block-image-width');
					}
				});
				break;

			default:
				throw new Error(`Unhandled attribute changed: ${name}`);
		}
	}

	getUrl() {
		const { url, source, medium, term, content, campaign } = this;

		if (typeof source !== 'string' && source.length !== 0) {
			return url;
		} else {
			const u = new URL(url, document.baseURI);

			if (! u.searchParams.has('utm_source')) {
				u.searchParams.set('utm_source', source);
			}

			if (! u.searchParams.has('utm_medium') && typeof medium === 'string' && medium.length !== 0) {
				u.searchParams.set('utm_medium', medium);
			} else if (! u.searchParams.has('utm_medium')) {
				u.searchParams.set('utm_medium', 'web');
			}

			if (! u.searchParams.has('utm_campaign') && typeof campaign === 'string' && campaign.length !== 0) {
				u.searchParams.set('utm_campaign', campaign);
			}

			if (! u.searchParams.has('utm_term') && typeof term === 'string' && term.length !== 0) {
				u.searchParams.set('utm_term', term);
			}

			if (! u.searchParams.has('utm_content') && typeof content === 'string' && content.length !== 0) {
				u.searchParams.set('utm_content', content);
			}

			return u.href;
		}
	}

	async getJSON() {
		const { label, description, image, callToAction, id, title, url, source, medium, campaign, term, content, layout, theme, imageFit, imagePosition, color, background, border, linkColor } = this;
		return JSON.stringify({
			id,
			title,
			label: await label,
			description: await description,
			image: await image,
			callToAction: await callToAction,
			layout,
			theme,
			background,
			border,
			color,
			linkColor,
			url,
			source,
			medium,
			campaign,
			term,
			content,
			imageFit,
			imagePosition,
		});
	}

	get background() {
		return this.getAttribute('background');
	}

	set background(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('background', val);
		} else {
			this.removeAttribute('background');
		}
	}

	get border() {
		return this.getAttribute('border');
	}

	set border(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('border', val);
		} else {
			this.removeAttribute('border');
		}
	}

	get borderWidth() {
		return this.getAttribute('borderwidth');
	}

	set borderWidth(val) {
		if ((typeof val === 'string' && val.length !== 0) || Number.isInteger(val) && val > 0) {
			this.setAttribute('borderwidth', val);
		} else {
			this.removeAttribute('borderwidth');
		}
	}

	get callToAction() {
		return this.getSlottedItem('calltoaction').then(el => {
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

	get campaign() {
		return this.getAttribute('campaign');
	}

	set campaign(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('campaign', val);
		} else {
			this.removeAttribute('campaign');
		}
	}

	get color() {
		return this.getAttribute('color');
	}

	set color(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('color', val);
		} else {
			this.removeAttribute('color');
		}
	}

	get content() {
		return this.getAttribute('content');
	}

	set content(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('content', val);
		} else {
			this.removeAttribute('content');
		}
	}

	get description() {
		return this.getSlottedItem('description').then(el => {
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
		return this.getSlottedItem('image').then(img => {
			if (img instanceof HTMLImageElement && img.hasAttribute('src')) {
				return img.src;
			} else {
				return null;
			}
		});
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
		return this.getSlottedItem('label').then(el => {
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

	get linkColor() {
		return this.getAttribute('linkcolor');
	}

	set linkColor(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('linkcolor', val);
		} else {
			this.removeAttribute('linkcolor');
		}
	}

	get media() {
		return this.getAttribute('media');
	}

	set media(val) {
		if (typeof val === 'string') {
			this.setAttribute('media', val);
		} else {
			this.removeAttribute('media');
		}
	}

	get medium() {
		return this.getAttribute('medium');
	}

	set medium(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('medium', val);
		} else {
			this.removeAttribute('medium');
		}
	}

	get source() {
		return this.getAttribute('source');
	}

	set source(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('source', val);
		} else {
			this.removeAttribute('source');
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

	get term() {
		return this.getAttribute('term');
	}

	set term(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('term', val);
		} else {
			this.removeAttribute('term');
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
			'background',
			'border',
			'borderwidth',
			'color',
			'height',
			'linkcolor',
			'loading',
			'media',
			'url',
			'width',
		];
	}
});

setTimeout(() => {
	document.querySelectorAll('#settings input').forEach(el => {
		el.addEventListener('change', ({ target }) => {
			document.querySelectorAll('ad-block').forEach(el => el[target.name] = target.value);
		});
	});
}, 1000);
