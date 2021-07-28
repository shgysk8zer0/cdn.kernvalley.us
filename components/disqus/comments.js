import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { loadScript } from '../../js/std-js/loader.js';
const protectedData = new WeakMap();

registerCustomElement('disqus-comments', class HTMLDisqusCommentsElement extends HTMLElement {
	constructor(identifier) {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });
		const slot = document.createElement('slot');
		slot.name = 'comments';
		shadow.append(slot);

		if (typeof identifier === 'string') {
			loadScript(`https://${identifier}.disqus.com/embed.js`, { crossOrigin: null }).then(script => {
				script.setAttribute('data-timestamp', Date.now());
				this.identifier = identifier;
				protectedData.set(this, { shadow });
			});
		} else {
			loadScript(`https://${this.identifier}.disqus.com/embed.js`, { crossOrigin: null }).then(script => {
				script.setAttribute('data-timestamp', Date.now());
				protectedData.set(this, { shadow });
			});
		}
	}

	connectedCallback() {
		const container = document.createElement('div');
		container.id = 'disqus_thread';
		container.slot = 'comments';
		this.append(container);
	}

	get identifier() {
		return this.getAttribute('identifier');
	}

	set identifier(val) {
		if (typeof val === 'string' && val.length !==0) {
			this.setAttribute('identifier', val);
		} else {
			this.removeAttribute('identifier');
		}
	}
});
