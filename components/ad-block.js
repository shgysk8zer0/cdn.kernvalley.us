import HTMLCustomElement from './custom-element.js';

async function log(event) {
	if ('target' in event) {
		const data = new FormData();
		data.set('datetime', Date.now());
		data.set('user[userAgent]', navigator.userAgent);
		data.set('user[screen][width]', screen.width);
		data.set('user[screen][height]', screen.height);
		data.set('user[screen][colorDepth]', screen.colorDepth);
		data.set('user[screen][pixelDepth]', screen.pixelDepth);
		data.set('user[language]', navigator.language);
		data.set('user[doNotTrack]', navigator.doNotTrack === '1');
		data.set('context[page][url]', `${location.origin}${location.pathname}`);
		data.set('context[page][title]', document.title);
		data.set('context[page][referrer]', document.referrer);
		data.set('context[ad][width]', event.target.scrollWidth || '');
		data.set('context[ad][height]', event.target.scrollHeight || '');
		data.set('context[ad][id]', event.target.id || '');
		data.set('context[ad][url]', event.target.url || '');

		if ('connection' in navigator) {
			data.set('connection[type]', navigator.connection.type || 'unknown');
			data.set('connection[effectiveType]', navigator.connection.effectiveType);
		} else {
			data.set('connection[type]', 'unknown');
			data.set('connection[effectiveType]', '');
		}

		if (event instanceof Event) {
			data.set('type', event.type);
		} else if (event instanceof IntersectionObserverEntry) {
			data.set('type', event.isIntersecting ? 'viewed' : 'passed');
		}

		// navigator.sendBeacon('https://api.kernvalley.us/test/', data);
	}
}

const shadows = new Map();

HTMLCustomElement.register('ad-block', class HTMLAddBlockElement extends HTMLElement {
	constructor() {
		super();
		this.setAttribute('itemtype', 'https://schema.org/WPAdBlock');
		this.setAttribute('itemscope', '');
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
		const style = document.createElement('link');

		this.addEventListener('mouseenter', log, { passive: true, once: true });
		this.addEventListener('click', log, { passive: true, once: true });
		this.addEventListener('contextmenu', log, { passive: true, once: true });
		this.addEventListener('remove', log, { passive: true, once: true });

		style.rel = 'stylesheet';
		style.crossOrigin = 'anonymous';
		style.href = new  URL('/components/ad-block.css', HTMLCustomElement.base);
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
			<path fill-rule="evenodd" d="M6 5h2v2H6V5zm6-.5V14c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V2c0-.55.45-1 1-1h7.5L12 4.5zM11 5L8 2H1v11l3-5 2 4 2-2 3 3V5z"/>
		</svg>`;
		logo.append(logoSlot);
		label.append(labelSlot);
		description.append(descriptionSlot);
		link.append(linkSlot);
		container.rel = 'noopener external nofollow';

		container.append(logo, label, description, link);
		shadow.append(style, container);
		shadows.set(this, shadow);
		this.dispatchEvent(new Event('ready'));
	}

	async connectedCallback() {
		new IntersectionObserver(async (entries, observer) => {
			const entry = entries.find(el => el.target === this);
			if (entry instanceof IntersectionObserverEntry && entry.isIntersecting) {
				this.classList.add('shown');
				this.dispatchEvent(new Event('shown'));
				log(entry);
				observer.unobserve(this);
			}
		}).observe(this);
		this.dispatchEvent(new Event('ready'));
	}

	async disconnectedCallback() {
		this.dispatchEvent(new Event('remove'));
	}

	async attributeChangedCallback(name, oldValue, newValue) {
		await this.ready;
		switch (name) {
		case 'theme':
			this.dispatchEvent(new CustomEvent('themechange', { detail: { oldValue, newValue } }));
			break;

		case 'url':
			shadows.get(this).childNodes.item(1).href = newValue;
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
