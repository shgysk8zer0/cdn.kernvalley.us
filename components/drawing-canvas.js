import { registerCustomElement, on } from '../js/std-js/custom-elements.js';
import { save } from '../js/std-js/filesystem.js';
import { loadImage } from '../js/std-js/loader.js';

export default class HTMLDrawingCanvasElement extends HTMLCanvasElement {
	connectedCallback() {
		this.ctx = this.getContext('2d', {alpha: this.alpha});
		this.ctx.lineWidth = this.lineWidth;
		this.ctx.fillStyle = this.fill;
		this.ctx.strokeStyle = this.stroke;
		this.ctx.fillRect(0, 0, this.width, this.height);
		this.dispatchEvent(new Event('ready'));

		const config = {};

		const draw = e => {
			e.preventDefault();
			const {top, left} = this.offset;

			if (window.hasOwnProperty('TouchEvent') && e instanceof TouchEvent && e.touches.length === 1) {
				const scale = this.scale;
				const {pageX, pageY} = e.touches.item(0);
				const [x, y] = [scale.x * (pageX - left), scale.y * (pageY - top)];
				this.ctx.lineTo(x, y);
				this.ctx.stroke();
			} else if (e instanceof MouseEvent) {
				const {pageX, pageY} = e;
				this.ctx.lineTo(pageX - left, pageY - top);
				this.ctx.stroke();
			}
		};

		const begin = e => {
			this.ctx.beginPath();
			const {top, left} = this.offset;

			if (window.hasOwnProperty('TouchEvent') && e instanceof TouchEvent && e.touches.length === 1) {
				const {pageX, pageY} = e.touches.item(0);
				const scale = this.scale;
				const [x, y] = [scale.x * (pageX - left), scale.y * (pageY - top)];
				this.ctx.moveTo(x, y);
				this.addEventListener('touchmove', draw, config);
			} else if (e instanceof MouseEvent) {
				const {pageX, pageY} = e;
				this.ctx.moveTo(pageX - left, pageY - top);
				this.addEventListener('mousemove', draw, config);
			}
		};

		const end = e => {
			if (window.hasOwnProperty('TouchEvent') && e instanceof TouchEvent) {
				this.removeEventListener('touchmove', draw, config);
			} else if (e instanceof MouseEvent) {
				this.removeEventListener('mousemove', draw, config);
			}
		};

		on(this, {
			touchstart: begin,
			mousedown: begin,
			touchend: end,
			mouseup: end,
		}, config);
	}

	get coords() {
		return this.getBoundingClientRect();
	}

	get scale() {
		const coords = this.coords;
		return {x: this.width / coords.width, y: this.height / coords.height};
	}

	get offset() {
		let el = this.offsetParent;
		const offset = {top: this.offsetTop, left: this.offsetLeft};
		while (el instanceof HTMLElement) {
			offset.left += el.offsetLeft;
			offset.top += el.offsetTop;
			el = el.offsetParent;
		}
		return offset;
	}

	get exportFormat() {
		return this.getAttribute('export-format') || 'image/jpeg';
	}

	set exportFormat(type) {
		this.setAttribute('export-format', type);
	}

	get exportQuality() {
		return parseFloat(this.getAttribute('export-quality')) || 1;
	}

	set exportQuality(quality) {
		if (typeof quality === 'number' && ! Number.isNaN(quality) && quality >= 0 && quality <= 1) {
			this.setAttribute('export-quality', quality);
		} else {
			throw new TypeError('Export quality must be a number [0, 1]');
		}
	}

	get stroke() {
		return this.getAttribute('stroke') || '#000';
	}

	set stroke(color) {
		this.setAttribute('stroke', color);
	}

	get fill() {
		return this.getAttribute('fill') || '#FFF';
	}

	set fill(color) {
		this.setAttribute('fill', color);
	}

	get lineWidth() {
		return parseFloat(this.getAttribute('line-width')) || 1;
	}

	set lineWidth(width) {
		if (typeof width === 'number') {
			this.setAttribute('line-width', width);
		}
	}

	get alpha() {
		return this.hasAttribute('alpha');
	}

	set alpha(enabled) {
		this.toggleAttribute('alpha', enabled);
	}

	get dataURL() {
		return this.toDataURL();
	}

	get blob() {
		return this.toBlob();
	}

	get imageData() {
		return this.getImageData();
	}

	async saveAs({ filename = 'canvas.png', type = 'image/png', quality = 0.8}) {
		const blob = await this.toBlob(type, quality);
		const file = new File([blob], filename, { type });
		await save(file);
	}

	async import(src, { x = 0, y = 0 } = {}) {
		const img = await loadImage(src);
		await img.decode();
		return this.ctx.drawImage(img, x, y);
	}

	async ready() {
		if (! (this.ctx instanceof CanvasRenderingContext2D)) {
			await new Promise(resolve => this.addEventListener('ready', resolve, {once: true}));
		}
	}

	save() {
		this.ctx.save();
	}

	restore() {
		this.ctx.restore();
	}

	async getImageData({x = 0, y = 0, width = this.width, height = this.height} = {}) {
		return this.ctx.getImageData(x, y, width, height);
	}

	async toBlob(mimeType = this.exportFormat, quality = this.exportQuality) {
		return await new Promise(resolve => super.toBlob(resolve, mimeType, quality));
	}

	fillRect({x = 0, y = 0, height = this.height, width = this.width, color} = {}) {
		if (typeof color === 'string') {
			this.color = color;
		}
		this.ctx.fillRect(x, y, width, height);
	}

	clear({x = 0, y = 0, height = this.height, width = this.width} = {}) {
		this.ctx.clearRect(x, y, width, height);
		this.fillRect({x, y, width, height});
	}

	async attributeChangedCallback(name, oldValue, newValue) {
		await this.ready();
		switch(name) {
			case 'fill':
				this.ctx.fillStyle = newValue;
				break;
			case 'stroke':
				this.ctx.strokeStyle = newValue;
				break;
			case 'line-width':
				this.ctx.lineWidth = newValue;
				break;
			default:
				throw new Error(`Unhandled attribute change: "${name}"`);
		}
	}

	static get observedAttributes() {
		return [
			'fill',
			'stroke',
			'line-width',
		];
	}
}

registerCustomElement('drawing-canvas', HTMLDrawingCanvasElement, {extends: 'canvas'});
