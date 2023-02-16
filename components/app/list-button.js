import { css, attr } from '../../js/std-js/dom.js';
import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { preload } from '../../js/std-js/loader.js';
import { getApps, apps as SRC } from '../../js/std-js/krv/apps.js';
import { hasGa, send } from '../../js/std-js/google-analytics.js';
import { getString, setString, getBool, setBool } from '../../js/std-js/attrs.js';
import { createXIcon } from '../../js/std-js/icons.js';
import { createImage } from '../../js/std-js/elements.js';

const fetchApps = getApps.once();

function log() {
	if (hasGa()) {
		send({
			hitType: 'event',
			eventCategory: 'outbound',
			eventAction: 'click',
			eventLabel: this.href,
			transport: 'beacon',
		});
	}
}

function makeAppItem({ name, url, description, image }) {
	const container = document.createElement('a');
	const nameEl = document.createElement('b');
	const link = document.createElement('meta');
	const descriptionEl = document.createElement('div');
	const img = createImage(image.url, { height: 150, width: 150, ...image });

	container.addEventListener('click', log, { passive: true, capture: true });

	attr(link, { 'itemprop': 'url', 'content': url });

	container.href = url;
	container.relList.add('noopener', 'external');

	attr(container, {
		'itemtype': 'https://schema.org/WebApplication',
		'itemscope': true,
		'title': `Open ${name}`,
	});

	css(container, {
		'display': 'grid',
		'padding': '12px',
		'color': 'inherit',
		'text-decoration': 'none',
		'grid-template-areas': '". image ." "name name name" "description description description"',
		'grid-template-columns': 'auto 150px auto',
		'grid-template-rows': '150px auto auto',
		'gap': '8px',
		'border': '1px solid #dedede',
		'border-radius': '12px',
	});

	nameEl.textContent = name;
	attr(nameEl, { 'itemprop': 'name' });
	css(nameEl, { 'grid-area': 'name', 'text-decoration': 'underline' });

	attr(descriptionEl, { 'itemprop': 'description' });
	descriptionEl.textContent = description;
	css(descriptionEl, { 'grid-area': 'description' });

	css(img, { 'grid-area': 'image', 'object-fit': 'cover', 'border-radius': '8px' });
	attr(img, { 'itemprop': 'image' });

	container.append(link, img, nameEl, descriptionEl);
	return container;
}

registerCustomElement('app-list', class HTMLKernValleyAppListButtonlement extends HTMLButtonElement {
	constructor({
		source = null,
		medium = null,
		content = null,
	} = {}) {
		super();
		this.addEventListener('click', this.show, { passive: true, capture: true });
		this.addEventListener('connected', () => {
			this.hidden = false;

			if (typeof source === 'string') {
				this.source = source;
			}

			if (typeof medium === 'string') {
				this.medium = medium;
			}

			if (typeof content === 'string') {
				this.content = content;
			}
		}, { once: true });
	}

	connectedCallback() {
		this.dispatchEvent(new Event('connected'));
	}

	get content() {
		return getString(this, 'content', { fallback: 'krv-app-list' });
	}

	set content(val) {
		setString(this, 'content', val);
	}

	get dev() {
		return getBool(this, 'dev');
	}

	set dev(val) {
		setBool(this, 'dev', val);
	}

	get medium() {
		return getString(this, 'medium', { fallback: 'referral' });
	}

	set medium(val) {
		setString(this, 'medium', val);
	}

	get host() {
		return getString(this, 'host');
	}

	set host(val) {
		setBool(this, 'host', val);
	}

	get source() {
		return getString(this, 'source');
	}

	set source(val) {
		setString(this, 'source', val);
	}

	async show() {
		this.disabled = true;
		const { source, medium, content, dev, host } = this;
		const dialog = document.createElement('dialog');
		const list = await HTMLKernValleyAppListButtonlement.getAppList({
			source, medium, content, dev, host,
		});
		const apps = list.map(makeAppItem);
		const header = document.createElement('header');
		const close = document.createElement('button');
		const container = document.createElement('div');

		css(header, {
			'height': '2.8em',
			'display': 'flex',
			'flex-direction': 'row',
			'position': 'sticky',
			'top': '0',
			'flex-basis': '100%',
		});

		close.append(createXIcon({
			styles: {
				'color': 'inherit',
				'max-width': '100%',
				'max-height': '100%',
				'width': 'var(--icon-size, 1em)',
				'height': 'var(--icon-size, 1em)',
				'vertical-align': 'middle',
			}
		}));

		close.addEventListener('click', ({ target }) => {
			target.closest('dialog').close();
			this.disabled = false;
		});
		css(close, {
			'display': 'inline-block',
			'background-color': '#dc3545',
			'color': '#fefefe',
			'border': 'none',
			'cursor': 'pointer',
			'font-size': '20px',
			'margin-left': 'auto',
			'border-radius': '4px',
			'padding': '0.3em',
		});
		close.title = 'Close Dialog';
		header.append(close);

		container.append(...apps);
		css(container, {
			'display': 'grid',
			'overflow-x': 'hidden',
			'overflow-y': 'auto',
			'grid-template-columns': 'repeat(auto-fit, 280px)',
			'grid-template-rows': 'repeat(auto-fit, auto)',
			'gap': '12px',
			'justify-content': 'space-evenly',
			'box-sizing': 'border-box',
			'padding': '3em 0',
		});

		dialog.append(header, container);
		dialog.addEventListener('close', ({ target }) => target.remove());
		css(dialog, { 'width': '80vw' });
		document.body.append(dialog);
		if (dialog.animate instanceof Function) {
			dialog.animate([{
				opacity: 0,
			}, {
				opacity: 1,
			}], {
				duration: 400,
				easing: 'ease-in-out',
				fill: 'both',
			});
		}
		dialog.showModal();
	}

	static preloadData() {
		preload(SRC, {
			as: 'fetch',
			type: 'application/json',
			importance: 'high',
		});
	}

	static async getAppList({ source = null, medium = null, content = null,
		dev = false, host = false,
	} = {}) {
		const list = await fetchApps();

		if (Array.isArray(list)) {
			const apps = list.map(app => {
				if (typeof app.url === 'string') {
					const url = new URL(app.url, document.baseURI);

					if (typeof source === 'string' && ! url.searchParams.has('utm_source')) {
						url.searchParams.set('utm_source', source);
						url.searchParams.set('utm_medium', medium || 'web');
						url.searchParams.set('utm_content', content || 'krv-app-list');
						app.url = url.href;
					}
				}

				return app;
			});

			if (dev && host) {
				return apps;
			} else if (host) {
				return apps.filter(({ dev }) => ! dev);
			} else if (dev) {
				return apps.filter(({ url }) => new URL(url).hostname !== location.hostname);
			} else {
				return apps.filter(({ dev, url }) =>
					! dev && new URL(url).hostname !== location.hostname
				);
			}
		} else {
			throw new Error('Failed fetching app list');
		}
	}
}, {
	extends: 'button',
});
