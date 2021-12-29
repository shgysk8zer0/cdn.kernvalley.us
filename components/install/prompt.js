import { registerCustomElement, getCustomElement } from '../../js/std-js/custom-elements.js';
import { meta } from '../../import.meta.js';
import { loadStylesheet } from '../../js/std-js/loader.js';
import { getHTML } from '../../js/std-js/http.js';
import { query, create, text, on, off } from '../../js/std-js/dom.js';
import { hasGa, send } from '../../js/std-js/google-analytics.js';
import { registerButton } from '../../js/std-js/pwa-install.js';
import { manifestPromise, getDeferred } from '../../js/std-js/promises.js';
import '../notification/html-notification.js';
const { resolve, promise: def } = getDeferred();
const getManifest = async () => await manifestPromise;

const templatePromise = def.then(() => getHTML(new URL('./components/install/prompt.html', meta.url)));

async function getTemplate() {
	resolve();
	const tmp = await templatePromise;
	return tmp.cloneNode(true);
}

function getBySize(opts, width) {
	if (Array.isArray(opts)) {
		const match = opts.find(opt => opt.sizes.startsWith(`${width}x`));
		return match || { src: null };
	} else {
		return { src: null };
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

		return img;
	} else {
		return getPicture({
			opts: icons,
			sizes: '10vmax',
			alt: 'App Icon',
		});
	}
}

if ('serviceWorker' in navigator && 'serviceWorker' in document.documentElement.dataset) {
	const { serviceWorker, scope = '/' } = document.documentElement.dataset;
	navigator.serviceWorker.register(serviceWorker, { scope }).catch(console.error);

	if ('reloadOnUpdate' in document.documentElement.dataset) {
		navigator.serviceWorker.ready.then(reg => {
			reg.addEventListener('updatefound', ({ target }) => {
				target.update();
				getCustomElement('html-notification').then(HTMLNotificationElement => {
					const notification = new HTMLNotificationElement('Update available', {
						body: 'App updated in background. Would you like to reload to see updates?',
						requireInteraction: true,
						actions: [{
							title: 'Reload',
							action: 'reload',
						}, {
							title: 'Dismiss',
							action: 'dismiss',
						}]
					});

					notification.addEventListener('notificationclick', ({ target, action }) => {
						switch(action) {
							case 'dismiss':
								target.close();
								break;

							case 'reload':
								target.close();
								location.reload();
								break;
						}
					});
				});
			});
		});
	}
}

registerCustomElement('install-prompt', class HTMLInstallPromptElement extends HTMLElement {
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });

		Promise.all([
			getTemplate(),
			getManifest(),
			loadStylesheet(new URL('./components/install/prompt.css', meta.url), { parent: shadow }),
		]).then(async ([base, manifest]) => {
			/**
			 * @TODO: Handle `prefer_related_applications` somehow
			 */
			const { name, description, features, categories = [], screenshots = [], icons = [],
				related_applications: relatedApps = [],/* prefer_related_applications: preferRelatedApps = false,*/
			} = manifest;

			registerButton(base.querySelector('.header-btn.install-btn')).catch(() => {});

			if (Array.isArray(screenshots) && screenshots.length !==0) {
				const screenshot = getPicture({
					opts:         screenshots,
					sizes:        '(max-width: 600px) 80vw, 40vw',
					fallbackWidth: 640,
				});

				base.querySelector('[part="screenshots"]').replaceChildren(screenshot);
			}

			if (Array.isArray(icons) && icons.length !== 0) {
				const icon = getIcon(...icons);
				base.querySelector('[part="icon"]').replaceChildren(icon);
			}

			text('[part="name"]', name, { base });
			text('[part="description"]', description, { base });
			on(query('[data-click="close"]', base), { click: () => this.open = false });
			on(query('[data-platform]', base), {
				click: ({ target }) => {
					const platform = target.closest('[data-platform]').dataset.platform;

					if (hasGa()) {
						send({
							eventCategory: 'install',
							eventAction: 'install',
							eventLabel: platform,
						});
					}

					this.dispatchEvent(new CustomEvent('install', { detail: { platform }}));
				}
			});

			if (Array.isArray(features)) {
				base.querySelector('[part="features"]').replaceChildren(...features.map(text => create('li', { text })));
			}

			if (Array.isArray(categories) && categories.length !== 0) {
				base.querySelector('[part="categories"]')
					.replaceChildren(...categories.map(text => create('li', { text, part: ['category'] })));
			}

			relatedApps.forEach(({ platform, url, id }) => {
				switch(platform) {
					case 'webapp':
						Promise.resolve(base.querySelector('[data-platform="webapp"]')).then(btn => {
							btn.hidden = false;

							registerButton(btn).catch(() => {});
						});
						break;

					case 'play':
					case 'itunes':
					case 'windows':
					case 'f-droid':
					case 'amazon':
						Promise.resolve(base.querySelector(`[data-platform="${platform}"]`)).then(btn => {
							if (btn instanceof HTMLAnchorElement) {
								const link = typeof url === 'string' ? new URL(url, btn.href) : new URL(btn.href);

								if (platform === 'play' && typeof id === 'string') {
									link.searchParams.set('id', id);
								}

								btn.href = link.href;
								btn.hidden = false;
							}
						});
						break;
				}
			});

			if (hasGa()) {
				on(query('[data-platform]', base), {
					click: ({ target }) => {
						send({
							eventCategory: 'install',
							eventAction: 'install',
							eventLabel: target.closest('[data-platform]').dataset.platform,
						});
					}
				}, { once: true });
			}

			requestAnimationFrame(() => {
				shadow.append(base);
				this.dispatchEvent(new Event('ready'));
			});
		});
	}

	async attributeChangedCallback(attr, oldVal, newVal) {
		switch(attr) {
			case 'open':
				if (typeof newVal === 'string') {
					this.dispatchEvent(new Event('open'));
				} else {
					this.dispatchEvent(new Event('close'));
				}
				break;

			default:
				throw new DOMException(`Invalid attribute change handled: ${attr}`);
		}
	}

	async show({ removeOnClose = true } = {}) {
		if (! this.isConnected) {
			document.body.append(this);
		}

		this.open = true;

		if (removeOnClose) {
			on(this, { close: ({ target }) => target.remove() }, { once: true });
		}

		return await new Promise((resolve, reject) => {
			const handlers = {
				install: ({ detail: { platform }}) => {
					off(this, handlers, { once: true });
					resolve({ platform });
					this.close();
				},
				close: () => {
					off(this, handlers, { once: true });
					reject(new DOMException('User cancelled install prompt'));
				},
			};

			on(this, handlers, { once: true });
		});
	}

	async close() {
		this.open = false;
	}

	get open() {
		return this.hasAttribute('open');
	}

	set open(val) {
		this.toggleAttribute('open', val);
	}

	static get observedAttributes() {
		return ['open'];
	}

	static get serviceWorker() {
		if ('serviceWorker' in navigator) {
			return navigator.serviceWorker.getRegistration();
		} else {
			return null;
		}
	}
});
