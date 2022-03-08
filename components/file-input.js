import { registerCustomElement } from '../js/std-js/custom-elements.js';

export default class HTMLFileInputElement extends HTMLInputElement {
	constructor() {
		super();
		this.type = 'file';

		this.addEventListener('change', async () => {
			this.dispatchEvent(new CustomEvent('filechange', {detail: await this.getFiles()}));
		});
	}

	get as() {
		return this.getAttribute('as') || 'data';
	}

	set as(as) {
		this.setAttribute('as', as.toLowerCase());
	}

	async fileChange() {
		return await new Promise(resolve => {
			this.addEventListener('filechange', event => resolve(event.detail), {once: true});
		});
	}

	async getFiles() {
		const files = [];

		for await (const file of this.filesGenerator()) {
			files.push(file);
		}

		return files;
	}

	async *filesGenerator() {
		const as = this.as.toLowerCase();

		for await (const file of this.files) {
			yield await new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.addEventListener('error', reject);
				reader.addEventListener('loadend', event => {
					resolve({
						file,
						data: event.target.result,
						modified: new Date(file.lastModified),
						as: this.as,
					});
				});

				switch(as) {
					case 'data':
						reader.readAsDataURL(file);
						break;
					case 'text':
						reader.readAsText(file);
						break;
					case 'binary':
						reader.readAsBinaryString(file);
						break;
					case 'arraybuffer':
						reader.readAsArrayBuffer(file);
						break;
					default:
						throw new Error(`Invalid option for "as" attribute: ${as}`);
				}
			});
		}
	}
}

registerCustomElement('file-input', HTMLFileInputElement, {extends: 'input'});
