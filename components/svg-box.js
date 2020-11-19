import { loadImage, preload } from '../js/std-js/loader.js';
import { registerCustomElement } from '../js/std-js/functions.js';

const SVGBOX = 'https://s.svgbox.net';
const timers = new WeakMap();

async function update(svgBox) {
	const { alt, icon, iconSet, fill, height, loading, width, frag } = svgBox;
	const src = new URL(`/${iconSet}.svg`, SVGBOX);

	if (typeof fill === 'string') {
		src.searchParams.set('fill', fill);
	}

	if (frag) {
		src.hash = `#${icon}`;
	} else {
		src.searchParams.set('ic', icon);
	}

	const img = await loadImage(src.href, { alt, height, width, loading });
	img.slot = 'icon';
	const current = svgBox.querySelector('img');

	if (current instanceof HTMLImageElement) {
		current.replaceWith(img);
	} else {
		svgBox.append(img);
	}
}

registerCustomElement('svg-box', class SVGBoxElement extends HTMLElement {
	constructor({
		alt     = null,
		iconSet = null,
		icon    = null,
		fill    = null,
		height  = null,
		width   = null,
		frag    = null,
	} = {}) {
		super();
		this.attachShadow({ mode: 'open' });
		const slot = document.createElement('slot');
		slot.name = 'icon';
		this.shadowRoot.append(slot);

		Promise.resolve().then(() => {
			if (typeof alt === 'string') {
				this.alt = alt;
			}

			if (typeof icon === 'string') {
				this.icon = icon;
			}

			if (typeof iconSet === 'string') {
				this.iconSet = iconSet;
			}

			if (typeof fill === 'string') {
				this.fill = fill;
			}

			if (typeof frag === 'boolean') {
				this.frag = frag;
			}

			if (Number.isInteger(height)) {
				this.height = height;
			}

			if (Number.isInteger(width)) {
				this.width = width;
			}
		});
	}

	attributeChangedCallback() {
		if (! timers.has(this)) {
			timers.set(this, setTimeout(() => {

				update(this).then(() => timers.delete(this));
			}, 30));
		}
	}

	connectedCallback() {
		if (! timers.has(this)) {
			timers.set(this, setTimeout(() => {
				update(this).then(() => timers.delete(this));
			}, 30));
		}
	}

	get alt() {
		return this.getAttribute('alt');
	}

	set alt(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('alt', val);
		}
	}

	get fill() {
		return this.getAttribute('fill');
	}

	set fill(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('fill', val);
		} else {
			this.removeAttribute('fill');
		}
	}

	get frag() {
		return this.hasAttribute('frag');
	}

	set frag(val) {
		this.toggleAttribute('frag', val);
	}

	get height() {
		if (this.hasAttribute('height')) {
			return parseInt(this.getAttribute('height'));
		} else {
			return null;
		}
	}

	set height(val) {
		if (Number.isInteger(val) && val > 0) {
			this.setAttribute('height', val);
		} else if (typeof val === 'string') {
			this.height = parseInt(val);
		} else {
			this.removeAttribute('height');
		}
	}

	get icon() {
		return this.getAttribute('icon');
	}

	set icon(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('icon', val);
		} else {
			this.removeAttribute('icon');
		}
	}

	get iconSet() {
		return this.getAttribute('iconset');
	}

	set iconSet(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('iconset', val);
		} else {
			this.removeAttribute('iconset');
		}
	}

	get loading() {
		return this.getAttribute('loading');
	}

	set loading(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('loading', val);
		} else {
			this.removeAtribute('loading');
		}
	}

	get width() {
		if (this.hasAttribute('width')) {
			return parseInt(this.getAttribute('width'));
		} else {
			return null;
		}
	}

	set width(val) {
		if (Number.isInteger(val) && val > 0) {
			this.setAttribute('width', val);
		} else if (typeof val === 'string') {
			this.width = parseInt(val);
		} else {
			this.removeAttribute('width');
		}
	}

	static get observedAttributes() {
		return [
			'alt',
			'height',
			'icon',
			'iconset',
			'fill',
			'frag',
			'width',
		];
	}

	static preload(iconSet, { fill = null, icon = null } = {}) {
		const url = new URL(`/${iconSet}.svg`, SVGBOX);

		if (typeof fill === 'string') {
			url.searchParams.set('fill', fill);
		}

		if (typeof icon === 'string') {
			url.searchParams.set('ic', icon);
		}

		return preload(url.href, { as: 'image', type: 'image/svg+xml' });
	}
});
