import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { createElement, createImage } from '../../js/std-js/elements.js';
import { getString, setString, getURL, setURL, getInt, setInt, getBool, setBool } from '../../js/std-js/attrs.js';
import { loadStylesheet } from '../../js/std-js/loader.js';
import { getURLResolver, isObject, setUTMParams } from '../../js/std-js/utility.js';
import { whenIntersecting } from '../../js/std-js/intersect.js';
import { meta } from '../../import.meta.js';
import { createPath, createSVG } from '../../js/std-js/svg.js';
import { createCallStartIcon, createMailIcon, createLinkExternalIcon, createInfoIcon } from '../../js/std-js/icons.js';
import { save, open } from '../../js/std-js/filesystem.js';

const protectedData = new WeakMap();
const resolveURL = getURLResolver({ base: meta.url, path: '/components/krv/' });
const ITEMTYPE = new URL('/WPAdBlock', 'https://schema.org').href;
const size = 18;
const callIcon = createCallStartIcon({ size });
const emailIcon = createMailIcon({ size });
const linkIcon = createLinkExternalIcon({ size });
const infoIcon = createInfoIcon();

const geoIcon = createSVG({
	width: size,
	height: size,
	viewBox: [0, 0, 16, 16],
	fill: 'currentColor',
	children: [
		createPath('M8 0a5 5 0 0 0-5 5c0 .173.014.332.031.5.014.167.036.336.063.5C3.666 9.514 6 12.003 8 14.003c2-2 4.334-4.489 4.906-8.003a6.38 6.38 0 0 0 .063-.5c.017-.168.03-.327.03-.5a5 5 0 0 0-5-5zm0 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4z')
	]
});


function getSlot(el, name) {
	const { shadow } = protectedData.get(el);
	return shadow.querySelector(`slot[name="${name}"]`);
}

function getSlotted(el, name) {
	const slot = getSlot(el, name);

	return slot instanceof HTMLElement ? slot.assignedElements() : [];
}

function clearSlotted(el, name) {
	getSlotted(el, name).forEach(el => el.remove());
}

function slotChange(itemprop) {
	return ({ currentTarget }) => {
		const assigned = currentTarget.assignedElements();
		assigned.forEach(el => el.setAttribute('itemprop', itemprop));
	};
}

function updateData(el, data) {
	if (! isObject(data)) {
		throw new TypeError('data must be an object');
	} else {
		protectedData.set(el, { ...protectedData.get(el), ...data });
	}
}

async function log(type, {
	id: uuid, label, source, campaign, medium, term, content, layout, theme,
}) {
	const endpoint = new URL('/api/events', 'https://ads.kernvalley.us');
	const params = Object.fromEntries(Object.entries({
		type, origin: location.origin, pathname: location.pathname, layout, theme,
		datetime: new Date().toISOString(), uuid, label, source, campaign, medium, term, content,
	}).filter(([,value]) => typeof value !== 'undefined' && ! Object.is(value, null)));

	if (
		['localhost'].includes(location.hostname)
		|| location.hostname.endsWith('.netlify.live')
		|| /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(location.hostname)
	) {
		console.info({ type, endpoint, params });
		return false;
	} else {
		return navigator.sendBeacon(endpoint, new URLSearchParams(params));
	}
}

class HTMLKRVAdElement extends HTMLElement {
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
		const shadow = this.attachShadow({ mode: 'closed' });
		const internals = this.attachInternals();
		internals.states.add('--loading');
		const publisher = createElement('div', {
			'@type': 'Organization',
			itemprop: 'publisher',
			itemscope: true,
			hidden: true,
			children: [
				createElement('meta', { itemprop: 'name', content: 'Kern Valley Ads' }),
				createElement('meta', { itemprop: 'url', content: 'https://ads.kernvalley.us' }),
				createElement('meta', { itemprop: 'logo', content: 'https://cdn.kernvalley.us/img/branding/ads.kernvalley.us.svg' }),
			]
		});

		const container = createElement('a', {
			id: 'container',
			part: ['container'],
			rel: 'noopner noreferrer external',
			itemprop: 'url',
			target: '_blank',
			events: {
				click: event => {
					if (
						event.isTrusted
						&& ! this.preview
						&& this.id.length !== 0
						&& event.currentTarget.href.length !== 0
						&& ! event.target.matches('#branding, #branding > *')
					) {
						log('click', this);
					}
				},
				once: true,
			},
			children: [
				createElement('h3', {
					id: 'label',
					part: ['label', 'text'],
					children: [
						createElement('slot', {
							name: 'label',
							events: { slotchange: slotChange('name') },
						}),
					]
				}),
				createElement('div', {
					id: 'image',
					part: ['image'],
					children: [
						createElement('slot', {
							name: 'image',
							events: { slotchange: slotChange('image') },
							children: [
								createImage('https://cdn.kernvalley.us/img/raster/missing-image.png', {
									referrerPolicy: 'no-referrer',
									crossOrigin: 'anonymous',
									loading: 'lazy',
								})
							]
						}),
					]
				}),
				createElement('div', {
					id: 'description',
					part: ['text', 'description'],
					children: [
						createElement('slot', {
							name: 'description',
							text: 'No Description',
							events: { slotchange: slotChange('description') },
						}),
					]
				}),
				createElement('div', {
					id: 'call-to-action',
					part: ['call-to-action'],
					children: [
						createElement('slot', {
							name: 'calltoaction',
							text: 'No Call-to-Action',
						}),
						createElement('span', {
							part: ['icon', 'call-icon'],
							children: [
								createElement('slot', {
									name: 'call-icon',
									children: [callIcon.cloneNode(true)],
								})
							]
						}),
						createElement('span', {
							part: ['icon', 'email-icon'],
							children: [
								createElement('slot', {
									name: 'email-icon',
									children: [emailIcon.cloneNode(true)],
								})
							]
						}),
						createElement('span', {
							part: ['icon', 'link-icon'],
							children: [
								createElement('slot', {
									name: 'link-icon',
									children: [linkIcon.cloneNode(true)],
								})
							]
						}),
						createElement('span', {
							part: ['icon', 'geo-icon'],
							children: [
								createElement('slot', {
									name: 'geo-icon',
									children: [geoIcon.cloneNode(true)],
								})
							]
						}),
					]
				}),
				createElement('a', {
					id: 'branding',
					part: ['branding'],
					href: setUTMParams('https://ads.kernvalley.us', {
						source: location.hostname,
						medium: 'referral',
						campaign: 'ad-info',
					}),
					target: '_blank',
					children: [
						createElement('span', {
							part: ['icon', 'branding-icon'],
							children: [infoIcon.cloneNode(true)]
						}),
						createElement('span', { text: 'Ads by KernValley.US' }),
					]
				})
			]
		});

		protectedData.set(this, { shadow, timeout: NaN, container, internals });

		if (typeof callToAction === 'string') {
			this.callToAction = callToAction;
		} else if (callToAction instanceof HTMLElement) {
			callToAction.slot = 'calltoaction';
			this.append(callToAction);
		}

		if (typeof label === 'string') {
			this.label = label;
		} else if(label instanceof HTMLElement) {
			label.slot = 'label';
			this.append(label);
		}

		if (typeof description === 'string') {
			this.description = description;
		} else if (description instanceof HTMLElement) {
			description.slot = 'description';
			this.append(description);
		}

		if (typeof image === 'string' || image instanceof URL) {
			this.image = image;
		} else if (image instanceof HTMLElement) {
			image.slot = 'image';
			this.append(image);
		}

		shadow.append(container);

		const publisherEl = this.querySelector('[itemprop="publisher"]');

		if (publisherEl instanceof HTMLElement) {
			publisherEl.replaceWith(publisher);
		} else {
			this.append(publisher);
		}

		this.addEventListener('connected', () => {
			// this.tabIndex = 0;
			this.setAttribute('itemtype', ITEMTYPE);
			this.setAttribute('itemscope', '');

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

			if (typeof height === 'number' && ! Number.isNaN(height)) {
				this.height = height;
			}

			if (typeof width === 'number' && ! Number.isNaN(height)) {
				this.width = width;
			}

		});
	}

	async connectedCallback() {
		this.dispatchEvent(new Event('connected'));
		const { shadow, internals } = protectedData.get(this);
		await whenIntersecting(this);
		internals.states.add('--seen');
		await loadStylesheet(resolveURL('./ad.css'), { parent: shadow });
		setTimeout(() => this.hidden = false, 1);
		internals.states.delete('--loading');


		if (this.id.length !== 0) {
			log('view', this);
		}
	}

	attributeChangedCallback(name, oldVal, newVal) {
		const { shadow, timeout, container } = protectedData.get(this);

		switch(name) {
			case 'url':
			case 'source':
			case 'medium':
			case 'term':
			case 'campaign':
			case 'content':
				if (! Number.isNaN(timeout)) {
					clearTimeout(timeout);
				}

				updateData(this, {
					timeout: setTimeout(() => {
						const url = this.getUrl();
						updateData(this, { timeout: NaN });
						setURL(shadow.querySelector('[part~="container"]'), 'href', url);
					}, 10),
				});

				break;

			case 'background':
				if (typeof newVal === 'string') {
					container.style.setProperty('--ad-background', newVal);
				} else {
					container.style.removeProperty('--ad-background');
				}

				break;
			case 'color':
				if (typeof newVal === 'string') {
					container.style.setProperty('--ad-color', newVal);
				} else {
					container.style.removeProperty('--ad-color');
				}

				break;

			case 'border':
				if (typeof newVal === 'string') {
					container.style.setProperty('--ad-border', newVal);
				} else {
					container.style.removeProperty('--ad-boder');
				}

				break;

			case 'borderwidth':
				if (typeof newVal === 'string') {
					container.style.setProperty('--ad-border-width', newVal);
				} else {
					container.style.removeProperty('--ad-border-width');
				}

				break;

			case 'linkcolor':
				if (typeof newVal === 'string') {
					container.style.setProperty('--ad-link-color', newVal);
				} else {
					container.style.removeProperty('--ad-link-color');
				}

				break;

			case 'media':
				// this.hidden = typeof newVal !== 'string' || ! matchMedia(newVal).matches;
				break;

			default:
				throw new Error(`Unsupported property changed: "${name}"`);
		}
	}

	toJSON() {
		const {
			id, label, description, callToAction, image, layout, theme, campaign,
			content, source, medium, term, border, borderWidth, background, color,
			imageFit, imagePosition, linkColor,
		} = this;

		return {
			'@context': 'https://schema.org', '@type': 'WPAdBlock',
			version: HTMLKRVAdElement.VERSION,
			identifier: id, label, description, callToAction, image, layout, theme,
			campaign, content, source, medium, term, border, borderWidth,
			background, color, imageFit, imagePosition, linkColor,
		};
	}

	get layout() {
		return getString(this, 'layout', { fallback: 'card' });
	}

	set layout(val) {
		setString(this, 'layout', val);
	}

	get theme() {
		return getString(this, 'theme', { fallback: 'auto' });
	}

	set theme(val) {
		setString(this, 'theme', val);
	}

	get preview() {
		return getBool(this, 'preview');
	}

	set preview(val) {
		setBool(this, 'preview', val);
	}

	get background() {
		return getString(this, 'background');
	}

	set background(val) {
		setString(this, 'background', val);
	}

	get color() {
		return getString(this, 'color');
	}

	set color(val) {
		setString(this, 'color', val);
	}

	get height() {
		return getInt(this, 'height');
	}

	set height(val) {
		setInt(this, 'height', val);
	}

	get width() {
		return getInt(this, 'width');
	}

	set width(val) {
		setInt(this, 'width', val);
	}

	get border() {
		return getString(this, 'border');
	}

	set border(val) {
		setString(this, 'border', val);
	}

	get borderWidth() {
		return getInt(this, 'borderwidth');
	}

	set borderWidth(val) {
		setInt(this, 'borderwidth', val);
	}

	get imageFit() {
		return getString(this, 'imagefit');
	}

	set imageFit(val) {
		setString(this, 'imagefit', val);
	}

	get imagePostion() {
		return getString(this, 'imageposition');
	}

	set imagePosition(val) {
		setString(this, 'imageposition', val);
	}

	get label() {
		const slotted = getSlotted(this, 'label');

		if (slotted.length === 1) {
			return slotted[0].textContent;
		} else {
			return null;
		}
	}

	set label(val) {
		clearSlotted(this, 'laebl');

		if (typeof val === 'string' && val.length !== 0) {
			this.append(createElement('span', {
				text: val,
				slot: 'label',
			}));
		}
	}

	get image() {
		const imgs = getSlotted(this, 'image');

		if (imgs.length === 1) {
			return imgs[0].src;
		} else {
			return null;
		}
	}

	set image(src) {
		clearSlotted(this, 'image');

		if (typeof src === 'string' && src.length !== 0) {
			this.append(createImage(src, {
				loading: 'lazy',
				alt: '',
				crossOrigin: 'anonymous',
				referrerPolicy: 'no-referrer',
				slot: 'image',
			}));
		}
	}

	get description() {
		const slotted = getSlotted(this, 'description');

		if (slotted.length === 1) {
			return slotted[0].textContent;
		} else {
			return null;
		}
	}

	set description(val) {
		clearSlotted(this, 'description');

		if (typeof val === 'string' && val.length !== 0) {
			this.append(createElement('span', {
				text: val,
				slot: 'description',
			}));
		}
	}

	get callToAction() {
		const slotted = getSlotted(this, 'calltoaction');

		if (slotted.length === 1) {
			return slotted[0].textContent;
		} else {
			return null;
		}
	}

	set callToAction(val) {
		clearSlotted(this, 'calltoaction');

		if (typeof val === 'string' && val.length !== 0) {
			this.append(createElement('span', {
				text: val,
				slot: 'calltoaction',
			}));
		}
	}

	get url() {
		return getURL(this, 'url');
	}

	set url(val) {
		setURL(this, 'url', val, { requirePath: false });
	}

	get campaign() {
		return getString(this, 'campaign');
	}

	set campaign(val) {
		setString(this, 'campaign', val);
	}

	get content() {
		return getString(this, 'content');
	}

	set content(val) {
		setString(this, 'content', val);
	}

	get medium() {
		return getString(this, 'medium', { fallback: 'referral' });
	}

	set medium(val) {
		setString(this, 'medium', val);
	}

	get source() {
		return getString(this, 'source');
	}

	set source(val) {
		setString(this, 'source', val);
	}

	get term() {
		return getString(this, 'term');
	}

	set term(val) {
		setString(this, 'term', val);
	}

	getUrl() {
		if (this.hasAttribute('url')) {
			const { url, source, medium, term, content, campaign } = this;
			const uri = new setUTMParams(url, { source, medium, term, content, campaign });

			switch(url.protocol) {
				case 'http:':
				case 'https:':
					return uri.href;

				case 'mailto:':
				case 'tel:':
				case 'geo:':
					return `${uri.protocol}${uri.pathname}`;

				default:
					throw new DOMException(`Unsupported protocol "${uri.protocol}"`);
			}
		}
	}

	async toFile({ name = 'ad.krvad', signal, priority } = {}) {
		return scheduler.postTask(() => {
			const data = JSON.stringify(this, null, 4);
			return new File([data], name, { type: HTMLKRVAdElement.CONTENT_TYPE });
		}, { signal, priority });
	}

	async downloadFile({ name = 'ad.krvad', signal, priority } = {}) {
		const file = await this.toFile({ name, signal, priority });
		await save(file);
	}

	static get observedAttributes() {
		return [
			'background',
			'border',
			'borderwidth',
			'color',
			'linkcolor',
			'media',
			'url',
			'source',
			'term',
			'content',
			'campaign',
			'medium',
		];
	}

	static fromJSONObject(data) {
		return new HTMLKRVAdElement(data);
	}

	static async fromFile(file) {
		if (! (file instanceof File)) {
			throw new Error('Expected instance of `File`');
		} else if (! file.name.endsWith('.krvad')) {
			throw new Error(`${file.name} is not a KRV Ad file`);
		} else {
			const data = JSON.parse(await file.text());
			return HTMLKRVAdElement.fromJSONObject(data);
		}
	}

	static async openFile() {
		const [file] = await open({ accept: [
			HTMLKRVAdElement.FILE_EXTENSION,
			HTMLKRVAdElement.CONTENT_TYPE,
		] });
		return await HTMLKRVAdElement.fromFile(file);
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
}

registerCustomElement('krv-ad', HTMLKRVAdElement);

