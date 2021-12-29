import HTMLCustomElement from '../custom-element.js';
import { save, open } from '../../js/std-js/filesystem.js';
import { popup } from '../../js/std-js/popup.js';
import { css, attr, on, off, loaded } from '../../js/std-js/dom.js';
import { loadStylesheet } from '../../js/std-js/loader.js';
import { hasGa, send } from '../../js/std-js/google-analytics.js';
import { getHTML } from '../../js/std-js/http.js';
import { meta } from '../../import.meta.js';
import { getDeferred } from '../../js/std-js/promises.js';
import UTM from '../../js/std-js/UTM.js';

const { resolve, promise: def } = getDeferred();

const templatePromise = def.then(() => getHTML(new URL('./components/ad/block.html', meta.url)));

async function getTemplate() {
	resolve();
	const tmp = await templatePromise;
	return tmp.cloneNode(true);
}

function log(eventAction, ad, transport = 'beacon') {
	if (hasGa() && ! ad.preview) {
		ad.label.then(label => {
			send({
				hitType: 'event',
				eventCategory: 'ad-block',
				eventLabel: `${label} ${ad.id || 'no id'}`,
				eventAction,
				transport,
			});
		});
	}
}

function keypress(event) {
	if (event instanceof Event && event.keyCode === 13) {
		return openLink.call(this, event);
	}
}

function openLink(event) {
	if (event instanceof Event && event.isTrusted !== false) {
		const ad = this.closest('ad-block');

		if (! ad.preview && ! (this instanceof HTMLAnchorElement)) {
			const url = this.getUrl();

			if (typeof url !== 'string') {
				throw new Error('No URL');
			} else if (new URL(url, document.baseURI).origin === location.origin) {
				log('ad-click', this);
				this.dispatchEvent(new Event('opened'));
				setTimeout(() => location.href = this.getUrl(), 20);
			} else {
				log('ad-click', this);
				popup(this.getUrl());
				this.dispatchEvent(new Event('opened'));
			}
		}
	}
}

const timers = new WeakMap();

const queries = new WeakMap();

const observer = ('IntersectionObserver' in window) ? new IntersectionObserver((entries, observer) => {
	entries.forEach(async ({ isIntersecting, target }) => {
		if (isIntersecting) {
			timers.set(target, setTimeout(() => {
				log('ad-view', target);
				observer.unobserve(target);
				timers.delete(target);
				target.dispatchEvent(new Event('show'));
			}, 500));
		} else if (timers.has(target)) {
			clearInterval(timers.get(target));
			timers.delete(target);
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
		identifier    = null,
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

		this.addEventListener('connected', () => {
			this.tabIndex = 0;
			this.setAttribute('role', 'document');

			if (typeof loading === 'string') {
				this.loading = loading;
			}

			if (typeof identifier === 'string') {
				this.id = identifier;
			}

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

			const container = document.createElement('div');
			const nameEl = document.createElement('meta');
			const urlEl = document.createElement('meta');
			const logoEl = document.createElement('meta');

			attr(container, {
				itemprop: 'publisher',
				itemtype: 'https://schema.org/Organization',
				itemscope: true,
				hidden: true,
			});

			attr(nameEl, { itemprop: 'name', content: 'Kern Valley Ads' });
			attr(urlEl, { itemprop: 'url', content: 'https://ads.kernvalley.us' });
			attr(logoEl, { itemprop: 'logo', content: 'https://cdn.kernvalley.us/img/branding/ads.kernvalley.us.svg' });
			container.append(nameEl, urlEl, logoEl);
			requestAnimationFrame(() => this.append(container));
		}, { once: true });

		Promise.allSettled([
			this.whenConnected,
			this.whenLoad,
			loadStylesheet(new URL('./components/ad/block.css', meta.url), { parent: this.shadowRoot }),
		]).then(() => {
			getTemplate().then(tmp => {
				tmp.querySelectorAll('slot[name]').forEach(el => {
					if (['label', 'description', 'image'].includes(el.name)) {
						el.addEventListener('slotchange', ({ target }) => {
							target.assignedElements().forEach(el => {
								switch(target.name) {
									case 'label':
										attr(el, { itemprop: 'name' });
										break;

									case 'description':
										attr(el, { itemprop: 'description' });
										break;

									case 'image':
										attr(el, { itemprop: 'image', role: 'img' });
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
	}

	connectedCallback() {
		this.dispatchEvent(new Event('connected'));
		Promise.all([this.ready, loaded()]).then(() => observer.observe(this));
		attr(this, { itemtype: 'https://schema.org/WPAdBlock', itemscope: true });
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
						css(container, { '--ad-background': newVal });
					} else {
						css(container, { '-ad-background': null });
					}
				});
				break;

			case 'border':
				this.ready.then(() => {
					const container = this.shadowRoot.getElementById('container');

					if (typeof newVal === 'string' && newVal.startsWith('#')) {
						css(container, { '--ad-border': newVal });
					} else {
						css(container, { '--ad-border': null });
					}
				});
				break;

			case 'borderwidth':
				this.ready.then(() => {
					const container = this.shadowRoot.getElementById('container');

					if (typeof newVal === 'string' && /\d$/.test(newVal)) {
						css(container, { '--ad-border-width': `${newVal}px` });
					} else if (typeof newVal === 'string') {
						css(container, { '--ad-border-width': newVal });
					} else {
						css(container, { '--ad-border-width': null });
					}
				});
				break;

			case 'color':
				this.ready.then(() => {
					const container = this.shadowRoot.getElementById('container');

					if (typeof newVal === 'string' && newVal.startsWith('#')) {
						css(container, { '--ad-color': newVal });
					} else {
						css(container, { '--ad-color': null });
					}
				});
				break;

			case 'linkcolor':
				this.ready.then(() => {
					const container = this.shadowRoot.getElementById('container');

					if (typeof newVal === 'string' && newVal.startsWith('#')) {
						css(container, { '--ad-link-color': newVal });
					} else {
						css(container, { '--ad-link-color': null });
					}
				});
				break;

			case 'url':
				if (typeof newVal !== 'string') {
					off(this, {
						click: openLink,
						keydown: keypress,
					}, { capture: true, passive: true });

					this.querySelectorAll('meta[itemprop="url"].ad-url').forEach(el => el.remove());
				} else if (newVal.length === 0) {
					this.removeAttribute('url');
				} else if (newVal.startsWith('/') || newVal.startsWith('./') || newVal.startsWith('#')) {
					this.url = new URL(newVal, document.baseURI);
				} else {
					on(this, {
						click: openLink,
						keydown: keypress,
					}, { capture: true, passive: true });
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
						css(container, {
							'--ad-block-height': newVal,
							'--ad-block-stack-height': newVal,
							'--ad-block-text-height': newVal,
							'--ad-block-image-height': newVal,
							'--ad-block-full-width-height': newVal,
						});
					} else {
						css(container, {
							'--ad-block-height': null,
							'--ad-block-stack-height': null,
							'--ad-block-text-height': null,
							'--ad-block-image-height': null,
							'--ad-block-full-width-height': null,
						});
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
						css(container, {
							'--ad-block-width': newVal,
							'--ad-block-stack-width': newVal,
							'--ad-block-text-width': newVal,
							'--ad-block-image-width': newVal,
						});
					} else {
						css(container, {
							'--ad-block-width': null,
							'--ad-block-stack-width': null,
							'--ad-block-text-width': null,
							'--ad-block-image-width': null,
						});
					}
				});
				break;

			default:
				throw new Error(`Unhandled attribute changed: ${name}`);
		}
	}

	getUrl() {
		if (this.hasAttribute('url')) {
			const { url, source, medium, term, content, campaign } = this;
			return new UTM(url, { source, medium, term, content, campaign }).href;
		}
	}

	async getJSON() {
		const { label, description, image, callToAction, id, title, url, source,
			medium, campaign, term, content, layout, theme, imageFit, imagePosition,
			color, background, border, linkColor } = this;

		return JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'WPAdBlock',
			version: HTMLAdBlockElement.VERSION,
			identifier: id,
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
		return this.getAttribute('campaign') || 'krv-ads';
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
			img.src = val;
			img.alt = '';
			img.loading = 'lazy';
			this.setSlot('image', img);
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

	get preview() {
		return this.hasAttribute('preview');
	}

	set preview(val) {
		this.toggleAttribute('preview', val);
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

	async toFile({ fname = 'ad.krvad' } = {}) {
		const json = await this.getJSON();
		return new File([json], fname, { type: HTMLAdBlockElement.CONTENT_TYPE });
	}

	async getDownloadURL({ fname = 'ad.krvad' } = {}) {
		const file = await this.toFile({ fname });
		return URL.createObjectURL(file);
	}

	async getDownloadLink({ fname = 'ad.krvad', text = null } = {}) {
		const href = await this.getDownloadURL({ fname });
		const a = document.createElement('a');

		a.href = href;
		a.download = fname;

		if (typeof text === 'string') {
			a.textContent = text;
		} else {
			a.textContent = `Download ${fname}`;
		}
		return a;
	}

	async copyJSON() {
		const json = await this.getJSON();
		return navigator.clipboard.writeText(json);
	}

	async copyHTML() {
		return navigator.clipboard.writeText(this.outerHTML);
	}

	async downloadFile({ fname = 'ad.krvad' } = {}) {
		const file = await this.toFile({ fname });
		await save(file);
	}

	async saveHTML({ fname = 'ad.html', type = 'text/html' } = {}) {
		const file = new File([this.outerHTML], fname, { type });
		await save(file);
	}

	static async fromClipboard() {
		if (navigator.clipboard && navigator.clipboard.readText instanceof Function) {
			const text = await navigator.clipboard.readText();

			if (text.startsWith('{') && text.endsWith('}')) {
				const data = await JSON.parse(text);
				return await HTMLAdBlockElement.fromJSONObject(data);
			} else {
				throw new Error('Cliboard did not contain valid data');
			}
		} else {
			throw new Error('Clipboard not supported');
		}
	}

	static get CONTENT_TYPE() {
		return 'application/krv-ad+json';
	}

	static get FILE_EXTENSION() {
		return '.krvad';
	}

	static get VERSION() {
		return '1.0.0';
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

	static async fromURL(url, {
		mode = 'cors',
		credentials = 'omit',
		redirect = 'follow',
		cache = 'default',
		referrerPolicy = 'no-referrer',
		headers = new Headers({ Accept: 'application/krvad+json' }),
	} = {}) {
		const resp = await fetch(url, { headers, referrerPolicy, mode, credentials, redirect, cache });

		if (resp.ok) {
			const json = await resp.json();
			return await HTMLAdBlockElement.fromJSONObject(json);
		} else {
			throw new Error(`${resp.url} [${resp.status} ${resp.statusText}]`);
		}
	}

	static async openFile() {
		const [file] = await open({ accept: ['.krvad', 'application/krvad+json'] });
		return await HTMLAdBlockElement.fromFile(file);
	}

	static async fromFile(file) {
		if (! (file instanceof File)) {
			throw new Error('Expected instance of `File`');
		} else if (! file.name.endsWith('.krvad')) {
			throw new Error(`${file.name} is not a KRV Ad file`);
		} else {
			const data = JSON.parse(await file.text());
			return HTMLAdBlockElement.fromJSONObject(data);
		}
	}

	static fromJSONObject(data) {
		const ad = new HTMLAdBlockElement(data);

		if ('identifier' in data) {
			ad.id = data.identifier;
		}

		return ad;
	}
});
