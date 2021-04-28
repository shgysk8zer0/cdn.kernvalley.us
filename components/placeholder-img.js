const protectedData = new WeakMap();

export function generateURL({ width = 640, height, backgroundColor, color, text, format } = {}) {
	const size = [width, height].filter(p => typeof p === 'number').join('x');
	const parts = [size, backgroundColor, color].filter(p => typeof p === 'string');
	const url = new URL(`/${[...parts].join('/')}.${format}`, 'https://via.placeholder.com');

	if (typeof text === 'string') {
		url.searchParams.set('text', text);
	}

	return url.href;
}

export class HTMLPlaceholderImageElement extends HTMLImageElement {
	constructor({ width, height, color, backgroundColor, text, format } = {}) {
		super();

		if (Number.isInteger(width)) {
			this.width = width;
		}

		if (Number.isInteger(height)) {
			this.height = height;
		}

		if (typeof color === 'string') {
			this.color = color;
		}

		if (typeof backgroundColor === 'string') {
			this.backgroundColor = backgroundColor;
		}

		if (typeof text === 'string') {
			this.text = text;
		}

		if (typeof format === 'string') {
			this.format = format;
		}
	}

	get backgroundColor() {
		if (this.hasAttribute('backgroundcolor')) {
			return this.getAttribute('backgroundcolor').toUpperCase().replace(/[^A-F0-9]/g, '');
		} else {
			return null;
		}
	}

	set backgroundColor(val) {
		if (typeof val === 'string' && /#?[0-9A-Fa-f]{6}/.test(val)) {
			this.setAttribute('backgroundcolor', val);
		} else {
			this.removeAttribute('backgroundcolor');
		}
	}

	get color() {
		if (this.hasAttribute('color')) {
			return this.getAttribute('color').toUpperCase().replace(/[^A-F0-9]/g, '');
		} else {
			return null;
		}
	}

	set color(val) {
		if (typeof val === 'string' && /#?[0-9A-Fa-f]{6}/.test(val)) {
			this.setAttribute('color', val);
		} else {
			this.removeAttribute('color');
		}
	}

	get format() {
		return this.getAttribute('format') || 'webp';
	}

	set format(val) {
		if (['webp', 'png', 'jpg', 'gif'].includes(val)) {
			this.setAttribute('format', val);
		} else {
			this.removeAttribute('format');
		}
	}

	get text() {
		return this.getAttribute('text');
	}

	set text(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('text', val);
		} else {
			this.removeAttribute('text');
		}
	}

	update() {
		this.src = generateURL(this);
	}

	attributeChangedCallback() {
		if (protectedData.has(this)) {
			cancelAnimationFrame(protectedData.get(this));
		}

		protectedData.set(this, requestAnimationFrame(() => {
			this.update();
			protectedData.delete(this);
		}));
	}

	static get observedAttributes() {
		return ['width', 'height', 'color', 'backgroundcolor', 'text', 'format'];
	}
}

customElements.define('placeholder-img', HTMLPlaceholderImageElement, { extends: 'img' });
