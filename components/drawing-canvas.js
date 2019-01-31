export default class HTMLDrawingCanvasElement extends HTMLCanvasElement {
	connectedCallback() {
		this.ctx = this.getContext('2d', {alpha: this.alpha});
		this.ctx.lineWidth = this.lineWidth;
		this.ctx.fillStyle = this.fill;
		this.ctx.strokeStyle = this.stroke;
		this.ctx.fillRect(0, 0, this.width, this.height);
		this.dispatchEvent(new Event('ready'));

		let mouse = {x: 0, y: 0};

		function paint() {
			this.ctx.lineTo(mouse.x, mouse.y);
			this.ctx.stroke();
		}

		this.addEventListener('mousemove', e => {
			mouse.x = e.pageX - this.offsetLeft;
			mouse.y = e.pageY - this.offsetTop;
		}, {
			passive: true,
		});

		this.addEventListener('mousedown', () => {
			this.ctx.beginPath();
			this.ctx.moveTo(mouse.x, mouse.y);
			this.addEventListener('mousemove', paint, false);
		}, {
			passive: true,
		});

		this.addEventListener('mouseup', () => {
			this.removeEventListener('mousemove', paint, false);
		}, {
			passive: true,
		});
	}

	get exportFormat() {
		return this.getAttribute('export-format') || 'image/jpeg';
	}

	set exportFormat(type) {
		this.setAttribute('export-format', type);
	}

	get exportQuality() {
		return parseInt(this.getAttribute('export-quality')) || 1;
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

customElements.define('drawing-canvas', HTMLDrawingCanvasElement, {extends: 'canvas'});
