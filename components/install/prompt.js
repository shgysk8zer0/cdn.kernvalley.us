import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { meta } from '../../import.meta.js';
import { loadStylesheet } from '../../js/std-js/loader.js';
import { getHTML, getManifest } from '../../js/std-js/http.js';
import { query, create, text, on, off } from '../../js/std-js/dom.js';
import { hasGa, send } from '../../js/std-js/google-analytics.js';
import { confirm } from '../../js/std-js/asyncDialog.js';

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

const beforeinstallprompt = new Promise(resolve => {
	window.addEventListener('beforeinstallprompt', event => {
		event.preventDefault();
		resolve(event);
	}, { once: true });
});

if ('serviceWorker' in navigator && 'serviceWorker' in document.documentElement.dataset) {
	const { serviceWorker, scope = '/' } = document.documentElement.dataset;
	navigator.serviceWorker.register(serviceWorker, { scope }).catch(console.error);

	if ('reloadOnUpdate' in document.documentElement.dataset) {
		navigator.serviceWorker.getRegistration().then(reg => {
			reg.addEventListener('updatefound', async () => {
				const [resp] = await Promise.all([
					confirm('App updated in background. Would you like to reload to see updates?'),
					reg.update(),
				]);

				if (resp === true) {
					location.reload();
				}
			});
		});
	}
}

registerCustomElement('install-prompt', class HTMLInstallPromptElement extends HTMLElement {
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });

		Promise.all([
			getHTML(new URL('./components/install/prompt.html', meta.url)),
			getManifest(),
			loadStylesheet(new URL('./components/install/prompt.css', meta.url), { parent: shadow }),
		]).then(async ([base, manifest]) => {
			/**
			 * @TODO: Handle `prefer_related_applications` somehow
			 */
			const { name, description, features, categories = [], screenshots = [], icons = [],
				related_applications: relatedApps = [],/* prefer_related_applications: preferRelatedApps = false,*/
			} = manifest;

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

							beforeinstallprompt.then(event => {
								const installHandler = async () => {
									const btns = query('[data-click="install"]', shadow);
									btns.forEach(btn => btn.disabled = true);
									off(btns, installHandler, { once: true });

									await event.prompt();
									const resp = await event.userChoice;

									if (resp === 'accepted') {
										this.open = false;
									}
								};

								requestAnimationFrame(() => {
									const btns = query('[data-click="install"]', shadow);

									on(btns, 'click', installHandler, { once: true });
									btns.forEach(btn => btn.disabled = false);
								});
							});
						});
						break;

					case 'play':
					case 'itunes':
					case 'windows':
						Promise.resolve(base.querySelector(`[data-platform="${platform}"]`)).then(btn => {
							if (btn instanceof HTMLAnchorElement) {
								const link = new URL(url, btn.href);

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
