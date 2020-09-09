import HTMLCustomElement from './custom-element.js';
import { loadStylesheet } from '../js/std-js/loader.js';
import { whenInViewport } from '../js/std-js/viewport.js';

async function log(event) {
	if ('target' in event) {
		const data = {
			datetime: Date.now(),
			event: event.type || 'unknown',
			user: {
				userAgent: navigator.userAgent,
				language: navigator.language,
				doNotTrack: navigator.doNotTrack,
				screen: {
					width: screen.width,
					height: screen.height,
					orientation: screen.orientation.type,
					pixelDepth: screen.pixelDepth,
					colorDepth: screen.colorDepth,
				},
				context: {
					page: {
						url: `${location.origin}${location.pathname}`,
						title: document.title,
						referrer: document.referrer,
					},
					ad: {
						width: event.target.scrollWidth,
						height: event.target.scrollHeight,
						id: event.target.id,
						url: event.target.url,
					}
				}
			}
		};

		if ('connection' in navigator) {
			data.user.connection = {
				type: navigator.connection.type,
				saveData: navigator.connection.saveData,
				effectiveType: navigator.connection.effectiveType,
				downlink: navigator.connection.downlink,
			};
		} else {
			data.user.connection = {
				type: 'unknown',
				saveData: false,
				effectiveType: '4g',
				downlink: NaN,
			};
		}

		// fetch('https://api.kernvalley.us/test/', {
		// 	method: 'POST',
		// 	mode: 'cors',
		// 	referrerPolicy: 'origin-when-cross-origin',
		// 	credientials: 'omit',
		// 	keepalive: true,
		// 	headers: new Headers({ 'Content-Type': 'application/json' }),
		// 	body: JSON.stringify(data),
		// }).catch(console.error);

		// console.info(data);

		// navigator.sendBeacon('https://api.kernvalley.us/test/', JSON.stringify(data));
	}
}

const shadows = new Map();

HTMLCustomElement.register('ad-block', class HTMLAdBlockElement extends HTMLCustomElement {
	constructor() {
		super();
		this.whenConnected.then(() => {
			this.setAttribute('itemtype', 'https://schema.org/WPAdBlock');
			this.setAttribute('itemscope', '');
		});

		const shadow = this.attachShadow({ mode: 'closed' });
		const container = document.createElement('a');
		const logo = document.createElement('div');
		const logoSlot = document.createElement('slot');
		const label = document.createElement('h3');
		const labelSlot = document.createElement('slot');
		const link = document.createElement('span');
		const linkSlot = document.createElement('slot');
		const description = document.createElement('div');
		const descriptionSlot = document.createElement('slot');

		loadStylesheet(new  URL('/components/ad-block.css', HTMLCustomElement.base).href, {
			parent: shadow,
			crossOrigin: 'anonymous',
			referrerPolicy: 'no-referrer',
		}).finally(() => {
			whenInViewport(this).then(() => {
				this.classList.add('shown');
				this.dispatchEvent(new Event('shown'));
				log({ target: this, type: 'visible' });
			});
		});

		this.addEventListener('mouseenter', log, { passive: true, once: true });
		this.addEventListener('click', log, { passive: true, once: true });
		this.addEventListener('contextmenu', log, { passive: true, once: true });
		this.addEventListener('remove', log, { passive: true, once: true });

		labelSlot.name = 'label';
		linkSlot.textContent = 'Click here to learn more';
		label.id = 'label';
		labelSlot.textContent = 'Your ad here';
		linkSlot.name = 'calltoaction';
		link.id = 'link';
		descriptionSlot.name = 'description';
		description.id = 'description';
		descriptionSlot.textContent = 'Display your ad throughout the Kern River Valley!';
		container.id = 'wrapper';
		logoSlot.name = 'image';
		logo.id = 'image';
		logoSlot.innerHTML = `<svg class="current-color" viewBox="0 0 12 16">
			<path fill-rule="evenodd" fill="currentColor" d="M6 5h2v2H6V5zm6-.5V14c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V2c0-.55.45-1 1-1h7.5L12 4.5zM11 5L8 2H1v11l3-5 2 4 2-2 3 3V5z"/>
		</svg>`;
		logo.append(logoSlot);
		label.append(labelSlot);
		description.append(descriptionSlot);
		link.append(linkSlot);
		container.relList.add('noopener', 'external', 'nofollow');

		container.append(logo, label, description, link);
		shadow.append(container);
		shadows.set(this, shadow);
		this.dispatchEvent(new Event('ready'));

	}

	async disconnectedCallback() {
		this.dispatchEvent(new Event('remove'));
	}

	async attributeChangedCallback(name, oldValue, newValue) {
		await this.whenConnected;
		await this.ready;
		switch (name) {
			case 'theme':
				this.dispatchEvent(new CustomEvent('themechange', { detail: { oldValue, newValue } }));
				break;

			case 'url':
				shadows.get(this).getElementById('wrapper').href = newValue;
				break;

			default:
				throw new Error(`Unhandled attribute changed: ${name}`);
		}
	}

	set description(val) {
		const el = document.createElement('span');
		el.textContent = val;
		el.slot = 'description';
		this.append(el);
	}

	set image(val) {
		if (typeof val === 'string') {
			const el = new Image();
			el.src = val;
			el.slot = 'image';
			this.append(el);
		} else if (val instanceof Element) {
			val.slot = 'image';
			this.append(val);
		}
	}

	set label(val) {
		const el = document.createElement('span');
		el.textContent = val;
		el.slot = 'label';
		this.append(el);
	}

	set callToAction(val) {
		const el = document.createElement('span');
		el.textContent = val;
		el.slot = 'calltoaction';
		this.append(el);
	}

	get ready() {
		return new Promise(resolve => {
			const shadow = shadows.get(this);
			if (shadow && shadow.childElementCount !== 0) {
				resolve();
			} else {
				this.addEventListener('ready', () => resolve(), { once: true });
			}
		});
	}

	get theme() {
		return this.getAttribute('theme') || 'auto';
	}

	set theme(val) {
		switch (val.toLowerCase()) {
			case 'light':
				this.setAttribute('theme', 'light');
				break;

			case 'dark':
				this.setAttribute('theme', 'dark');
				break;

			case '':
			case 'auto':
				this.removeAttribute('theme');
				break;

			default:
				throw new Error(`Unsupported theme: ${val}`);
		}
	}

	get shown() {
		return new Promise(resolve => {
			if (this.classList.contains('shown')) {
				resolve();
			} else {
				this.addEventListener('shown', () => resolve(), { once: true });
			}
		});
	}

	get url() {
		return this.getAttribute('url');
	}

	set url(val) {
		this.setAttribute('url', val);
	}

	static get observedAttributes() {
		return [
			'theme',
			'url',
		];
	}
});
