import '../file-input.js';
import '../drawing-canvas.js';
import '../../js/std-js/shims.js';
import { importLink } from '../../js/std-js/functions.js';
import { registerCustomElement } from '../../js/std-js/custom-elements.js'
import { $ } from '../../js/std-js/esQuery.js'
import { confirm } from '../../js/std-js/asyncDialog.js';

export default class HTMLPaintAppElement extends HTMLElement {
	constructor() {
		super();
		const shadow = this.attachShadow({mode: 'open'});
		importLink('paint-app-template').then(async tmp => {
			tmp = tmp.cloneNode(true);
			shadow.append(...tmp.head.children, ...tmp.body.children);
			[...shadow.querySelectorAll('form')].forEach(form => form.addEventListener('submit', event => event.preventDefault()));

			$('a[download]', shadow).click(e => e.target.closest('a[download]').href = this.dataURL);

			const canvas = shadow.querySelector('canvas');
			$('#clear-btn', shadow).click(async () => {
				if (await confirm('Are you sure you want to erase everything?')) {
					canvas.clear();
				}
			});

			$('#save-btn', shadow).click(async () => {
				const img = new Image();
				img.src = canvas.dataURL;
				img.slot = 'output';
				this.append(img);
			});

			$('#image-input', shadow).on('filechange', async event => {
				try {
					const canvas = shadow.querySelector('canvas');
					const image = new Image();
					const srcUrl = URL.createObjectURL(event.detail[0].file);
					image.src = srcUrl;
					await new Promise((resolve, reject) => {
						if (image.complete) {
							resolve();
						} else {
							image.addEventListener('load', () => resolve(), {once: true});
							image.addEventListener('error', reject);
						}
					});
					canvas.height = image.naturalHeight;
					canvas.width = image.naturalWidth;
					canvas.ctx.drawImage(image, 0, 0);
					URL.revokeObjectURL(srcUrl);
				} catch(err) {
					console.error(err);
				}
			});

			$('#color-picker', shadow).change(event => canvas.stroke = event.target.value);
			$('#stroke-width', shadow).change(event => canvas.lineWidth = parseInt(event.target.value));
			this.dispatchEvent(new Event('ready'));
		});
	}

	get output() {
		const slot = this.shadowRoot.querySelector('slot[name="output"]');
		return slot.assignedNodes();
	}

	get canvas() {
		return this.shadowRoot.querySelector('canvas[is="drawing-canvas"]');
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

	get dataURL() {
		return this.canvas.toDataURL();
	}

	get blob() {
		return this.canvas.toBlob();
	}

	get imageData() {
		return this.canvas.getImageData();
	}

	async ready() {
		await Promise.all(['file-input', 'drawing-canvas'].map(el => customElements.whenDefined(el)));
		if (! (this.canvas instanceof HTMLElement)) {
			await new Promise(resolve => {
				this.addEventListener('load', () => resolve(), {once: true});
			});
		}
		await this.canvas.ready();
	}

	async attributeChangedCallback(name, oldValue, newValue) {
		await this.ready();
		switch(name) {
			case 'fill':
				this.canvas.fill = newValue;
				break;
			case 'stroke':
				this.ctx.stroke = newValue;
				break;
			case 'line-width':
				this.canvas.lineWidth = newValue;
				break;
			case 'export-format':
				this.canvas.exportFormat = newValue;
				break;
			case 'export-quality':
				this.canvas.exportQuality = newValue;
				break;
			case 'height':
				this.canvas.height = newValue;
				break;
			case 'width':
				this.canvas.width = newValue;
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
			'export-format',
			'export-quality',
			'height',
			'width',
		];
	}
}

registerCustomElement('paint-app', HTMLPaintAppElement);
