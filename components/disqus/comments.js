import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { loadScript, preload } from '../../js/std-js/loader.js';
const protectedData = new WeakMap();
const preloadOpts = {
	as: 'script',
	crossOrigin: null,
	importance: 'low',
};
const observer = new IntersectionObserver((entries, observer) => {
	entries.forEach(({ target, isIntersecting }) => {
		if (isIntersecting) {
			observer.unobserve(target);
			loadScript(`https://${target.site}.disqus.com/embed.js`,  { crossOrigin: null, parent: target })
				.then(script => script.setAttribute('data-timestamp', Date.now()))
				.then(() => parent.dispatchEvent(new Event('ready')));
		}
	});
}, {
	rootMargin: `${Math.floor(screen.height * 0.3)}px`,
});

registerCustomElement('disqus-comments', class HTMLDisqusCommentsElement extends HTMLElement {
	constructor(site) {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });
		const slot = document.createElement('slot');
		const container = document.createElement('div');
		container.id = 'disqus_thread';
		container.slot = 'comments';
		slot.name = 'comments';
		shadow.append(slot);
		this.append(container);

		if (typeof site === 'string') {
			preload(`https://${site}.disqus.com/embed.js`, preloadOpts);
			requestIdleCallback(() => {
				this.site = site;
				observer.observe(this);
			});
		} else {
			preload(`https://${this.site}.disqus.com/embed.js`, preloadOpts);
			observer.observe(this);
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
