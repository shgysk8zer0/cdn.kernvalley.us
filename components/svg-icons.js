/**
 * Imports SVG sprites from a remote src and allows getting of full `<svg>`s
 */
customElements.define('svg-icons', class SVGIconsElement extends HTMLElement {
	constructor() {
		super();
		this.hidden = true;
	}

	attributeChangedCallback(attr, oldVal, newVal) {
		switch(attr) {
		case 'src':
			if (typeof newVal === 'string' && newVal !== '') {
				this.dispatchEvent(new CustomEvent('srcchange', {detail: {newVal, oldVal}}));
				this.getIcons().then(async svg => {
					[...this.children].forEach(el => el.remove());
					this.append(svg);
					this.dispatchEvent(new Event('load'));
				});
			} else {
				this.dispatchEvent(new CustomEvent('srcclear', {detail: {newVal, oldVal}}));
			}
			break;

		default:
			throw new Error(`Invalid attribute changed: ${attr}`);
		}
	}

	get hasSrc() {
		return new Promise(resolve => {
			if (this.hasAttribute('src')) {
				resolve();
			} else {
				this.addEventListener('srcchange', () => resolve(), {once: true});
			}
		});
	}

	get iconList() {
		return [...this.querySelectorAll('symbol[id]')].map(el => el.id);
	}

	get ready() {
		return new Promise(resolve => {
			if (this.querySelector('svg') === null) {
				this.addEventListener('load', () => resolve(), {once: true});
			} else {
				resolve();
			}
		});
	}

	get src() {
		return new URL(this.getAttribute('src'), document.baseURI);
	}

	set src(val) {
		this.setAttribute('src', val);
	}

	static get observedAttributes() {
		return [
			'src',
		];
	}

	async getIcons() {
		await this.hasSrc;
		const resp = await fetch(this.src, {mode: 'cors'});
		const doc = new DOMParser().parseFromString(await resp.text(), 'image/svg+xml');
		return doc.documentElement;
	}

	async getSprite(id) {
		await this.ready;
		const symbol = this.querySelector(`symbol#${CSS.escape(id)}`);

		if (symbol instanceof Element) {
			const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			svg.setAttribute('viewBox', symbol.getAttribute('viewBox'));
			[...symbol.children].forEach(el => svg.appendChild(el.cloneNode(true)));
			return svg;
		} else {
			throw new Error(`${id} not found`);
		}
	}
});
