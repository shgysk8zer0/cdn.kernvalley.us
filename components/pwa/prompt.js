import HTMLCustomElement from '../custom-element.js';
import { registerButton } from '../../js/pwa-install.js';
import { getHTML } from '../../js/std-js/http.js';
import { meta } from '../../import.meta.js';
import { getDeferred } from '../../js/std-js/promises.js';
import { purify as policy } from '../../js/std-js/htmlpurify.js';
const { resolve, promise: def } = getDeferred();

const templatePromise = def.then(() => getHTML(new URL('./components/pwa/prompt.html', meta.url),  { policy }));

async function getTemplate() {
	resolve();
	const tmp = await templatePromise;
	return tmp.cloneNode(true);
}

function getBySize(opts, width) {
	if (Array.isArray(opts)) {
		const match = opts.find(opt => opt.sizes.startsWith(`${width}x`));
		return match || {src: null};
	} else {
		return {src: null};
	}
}

function getPicture({
	opts           = [],
	sizes          = '100%',
	decoding       = 'async',
	loading        = 'lazy',
	crossOrigin    = 'anonymous',
	referrerPolicy = 'no-referrer',
	alt            = 'image',
	fallbackWidth  = 192,
	slot           = null,
} = {}) {
	const pic = document.createElement('picture');
	const img = document.createElement('img');

	img.decoding = decoding;
	img.loading = loading;
	img.alt = alt;
	img.sizes = sizes;
	img.crossOrigin = crossOrigin;
	img.referrerPolicy = referrerPolicy;
	img.src = getBySize(opts, fallbackWidth).src;

	const srcs = opts.reduce(((srcs, {src, sizes = '', type = null} = {}) => {
		const [width = null] = sizes.split('x', 1);
		if (! (srcs.hasOwnProperty(type))) {
			srcs[type] = [`${src} ${width}w`];
		} else {
			srcs[type].push(`${src} ${width}w`);
		}

		return srcs;
	}), {});

	if (typeof slot === 'string') {
		pic.slot = slot;
	}

	pic.append(...Object.entries(srcs).map(([type, srcs]) => {
		const src = document.createElement('source');
		src.type = type;
		src.srcset = srcs.join(', ');
		src.sizes = img.sizes;
		return src;
	}), img);

	return pic;
}

function getIcon(...icons) {
	let icon = icons.find(icon => icon.type === 'image/svg+xml');

	if (icon) {
		const img = document.createElement('img');
		img.src = icon.src;
		img.decoding = 'async';
		img.loading = 'lazy';
		img.alt = 'App Icon';
		img.height = 192;
		img.width = 192;
		img.slot = 'icons';

		return img;
	} else {
		return getPicture({
			opts: icons,
			sizes: '10vmax',
			alt: 'App Icon',
			slot: 'icons',
		});
	}
}

HTMLCustomElement.register('pwa-prompt', class HTMLPWAPromptElement extends HTMLCustomElement {
	constructor({
		name                 = null,
		// short_name        = null,
		description          = null,
		icons                = null,
		screenshots          = null,
		features             = null,
		related_applications = [],
	} = {}) {
		super();
		this.attachShadow({ mode: 'open' });

		getTemplate().then(tmp => {
			tmp.querySelectorAll('[data-click]').forEach(el => {
				switch(el.dataset.click) {
					case 'close':
						el.addEventListener('click', () => this.close({ install: false }));
						break;

					case 'install':
						registerButton(el).catch(() => {});
						break;
				}
			});

			this.shadowRoot.append(tmp);
			this.dispatchEvent(new Event('ready'));
		});

		if (typeof name === 'string') {
			this.setSlot('name', name);
		}

		if (typeof description === 'string') {
			this.setSlot('description', description);
		}

		if (Array.isArray(features) && features.length !== 0) {
			const ul = document.createElement('ul');
			const lis = features.map(feature => {
				const li = document.createElement('li');
				li.textContent = feature;
				return li;
			});
			ul.append(...lis);

			this.setSlot('features', ul);
		}

		if (Array.isArray(related_applications)) {
			this.ready.then(() => {
				related_applications.forEach(({ platform, id, url }) => {
					const btn = this.shadowRoot.querySelector(`[data-platform="${platform}"]`);

					if (btn instanceof HTMLAnchorElement) {
						if (typeof url === 'string') {
							btn.href = url;
							btn.hidden = false;
						} else if (typeof id === 'string') {
							const link = new URL(btn.href);
							link.searchParams.set('id', id);
							btn.href = link.href;
							btn.hidden = false;
						} else {
							console.error(`Invalid entry for platform: ${platform}`);
						}
					} else if (btn instanceof HTMLButtonElement && btn.dataset.platform === 'webapp') {
						//registerButton(btn).catch(nullFunction);
						// should already be registered
					}
				});
			});
		}

		if (Array.isArray(screenshots) && screenshots.length !==0) {
			const screenshot = getPicture({
				opts:         screenshots,
				slot:         'screenshots',
				sizes:        '(max-width: 600px) 80vw, 40vw',
				fallbackWidth: 640,
			});
			this.append(screenshot);
		}

		if (Array.isArray(icons) && icons.length !== 0) {
			const icon = getIcon(...icons);
			this.append(icon);
		}
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch(name) {
			case 'open':
				if (newValue !== null) {
					this.dispatchEvent(new Event('open'));
				}
				break;

			default:
				throw new Error(`Unhandled event change: ${name}`);
		}
	}

	get open() {
		return this.hasAttribute('open');
	}

	set open(val) {
		this.toggleAttribute('open', val);
	}

	get opened() {
		if (this.open) {
			return Promise.resolve();
		} else {
			return new Promise(resolve => this.addEventListener('open', () => resolve(), {once: true}));
		}
	}

	get closed() {
		if (! this.open) {
			return Promise.resolve(null);
		} else {
			return new Promise(resolve => this.addEventListener('close', event => resolve(event.detail), {once: true}));
		}
	}

	show() {
		this.open = true;
	}

	async prompt() {
		await this.ready;
		this.show();
		return await this.closed;
	}

	close(detail = null) {
		this.open = false;

		if (typeof detail === 'boolean' && window.ga instanceof Function) {
			/**
			 * Probably safe to assume `ga` is the function for Google Analytics,
			 * so send a pwa-install event
			 */
			window.ga('send', {
				hitType: 'event',
				eventCategory: 'pwa-install',
				eventLabel: 'Installed PWA',
				transport: 'beacon',
			});
		}
		this.dispatchEvent(new CustomEvent('close', { detail }));
	}

	static get observedAttributes() {
		return [
			'open',
		];
	}
});
