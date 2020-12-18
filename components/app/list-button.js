import { registerCustomElement, css, attr } from '../../js/std-js/functions.js';
import { loadImage } from '../../js/std-js/loader.js';
import { getJSON } from '../../js/std-js/http.js';

function log() {
	if (window.ga instanceof Function) {
		window.ga('send', {
			hitType: 'event',
			eventCategory: 'outbound',
			eventAction: 'click',
			eventLabel: this.href,
			transport: 'beacon',
		});
	}
}

async function makeAppItem({ name, url, description, image }) {
	const container = document.createElement('a');
	const nameEl = document.createElement('b');
	const link = document.createElement('meta');
	const descriptionEl = document.createElement('div');
	const img = await loadImage(image.url, { height: 150, width: 150, ...image });

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
		'border': '1px solid currentColor',
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
		Promise.resolve().then(() => {
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
		});
	}

	get content() {
		return this.getAttribute('content') || 'krv-app-list';
	}

	set content(value) {
		if (typeof value === 'string' && value.length !== 0) {
			this.setAttribute('content', value);
		} else {
			this.removeAttribute('content');
		}
	}

	get medium() {
		return this.getAttribute('medium') || 'web';
	}

	set medium(value) {
		if (typeof value === 'string' && value.length !== 0) {
			this.setAttribute('medium', value);
		} else {
			this.removeAttribute('medium');
		}
	}

	get source() {
		return this.getAttribute('source');
	}

	set source(value) {
		if (typeof value === 'string' && value.length !== 0) {
			this.setAttribute('source', value);
		} else {
			this.removeAttribute('source');
		}
	}

	async show() {
		this.disabled = true;
		const { source, medium, content } = this;
		const dialog = document.createElement('dialog');
		const list = await HTMLKernValleyAppListButtonlement.getAppList({ source, medium, content });
		const apps = await Promise.all(list.map(makeAppItem));
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

		close.textContent ='X';
		close.addEventListener('click', ({ target }) => {
			target.closest('dialog').close();
			this.disabled = false;
		});
		css(close, {
			'background-color': '#dc3545',
			'color': '#fefefe',
			'border': 'none',
			'cursor': 'pointer',
			'font-size': '2em',
			'margin-left': 'auto',
			'border-radius': '4px',
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

	static async getAppList({ source = null, medium = null, content = null } = {}) {
		const list = await getJSON('https://apps.kernvalley.us/apps.json');

		if (Array.isArray(list)) {
			return list.map(app => {
				if (typeof app.url === 'string') {
					const url = new URL(app.url, document.baseURI);

					if (! url.searchParams.has('utm_source')) {
						url.searchParams.set('utm_source', source);
						url.searchParams.set('utm_medium', medium || 'web');
						url.searchParams.set('utm_content', content || 'krv-app-list');
						app.url = url.href;
					}
				}

				return app;
			});
		} else {
			throw new Error('Failed fetching app list');
		}
	}
}, {
	extends: 'button',
});
