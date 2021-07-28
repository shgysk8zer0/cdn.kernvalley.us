import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { loadScript } from '../../js/std-js/loader.js';
const protectedData = new WeakMap();

registerCustomElement('disqus-comments', class HTMLDisqusCommentsElement extends HTMLElement {
	constructor(site) {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });
		const slot = document.createElement('slot');const container = document.createElement('div');
		container.id = 'disqus_thread';
		container.slot = 'comments';
		slot.name = 'comments';
		shadow.append(slot);
		this.append(container);

		if (typeof site === 'string') {
			loadScript(`https://${site}.disqus.com/embed.js`, { crossOrigin: null }).then(script => {
				script.setAttribute('data-timestamp', Date.now());
				this.site = site;
				protectedData.set(this, { shadow });
				this.dispatchEvent(new Event('ready'));
			});
		} else {
			loadScript(`https://${this.site}.disqus.com/embed.js`, { crossOrigin: null }).then(script => {
				script.setAttribute('data-timestamp', Date.now());
				protectedData.set(this, { shadow });
				this.dispatchEvent(new Event('ready'));
			});
		}
	}

	get ready() {
		if (! protectedData.has(this)) {
			return new Promise(resolve => this.addEventListener('ready', () => resolve(), { once: true }));
		} else{
			return Promise.resolve();
		}
	}

	get site() {
		return this.getAttribute('site');
	}

	set site(val) {
		if (typeof val === 'string' && val.length !==0) {
			this.setAttribute('site', val);
			this.dispatchEvent(new Event('sitechange'));
		} else {
			this.removeAttribute('site');
			this.dispatchEvent(new Event('sitechange'));
		}
	}
});
