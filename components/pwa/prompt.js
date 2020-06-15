import CustomElement from '../custom-element.js';

customElements.define('pwa-prompt', class HTMLPWAPromptElement extends CustomElement {
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
		this.attachShadow({mode: 'open'});

		this.getTemplate('./components/pwa/prompt.html').then(tmp => {
			tmp.querySelectorAll('[data-click]').forEach(el => {
				switch(el.dataset.click) {
				case 'close':
					el.addEventListener('click', () => this.close({install: false}));
					break;

				case 'install':
					el.addEventListener('click', () => this.close({install: true}));
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
				related_applications.forEach(({platform, id, url}) => {
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
					}
				});
			});
		}

		if (Array.isArray(screenshots) && screenshots.length !==0) {
			/**
			 * TODO handle multiple screenshots
			 */
			[screenshots[0]].forEach(({sizes = null, src = null} = {}) => {
				const img = document.createElement('img');
				const [width, height] = sizes.split('x');
				img.height = height;
				img.width = width;
				img.src = src;
				img.slot = 'screenshots';
				this.append(img);
			});
		}

		if (Array.isArray(icons) && icons.length !== 0) {
			/**
			 * TODO Handle icons as responsive images via `<img srcset="..." sizes="...">`
			 */
			const icon = icons.find(icon => icon.sizes === 'any' || icon.sizes === '192x192');
			if (icon) {
				const img = document.createElement('img');
				img.height = 192;
				img.width = 192;
				img.src = icon.src;
				this.setSlot('icons', img);
			}
		}
	}

	attributeChangedCallback(name, newValue) {
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
		this.dispatchEvent(new CustomEvent('close', {detail}));
	}

	static get observedAttributes() {
		return [
			'open',
		];
	}
});
