import { wait, importLink, registerCustomElement } from '../../js/std-js/functions.js';
import { pageVisible } from '../../js/std-js/functions.js';

export default class HTMLImgurGalleryElement extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({mode: 'open'});
		importLink('imgur-gallery-template').then(tmp => {
			tmp = tmp.cloneNode(true);
			this.shadowRoot.append(...tmp.head.children, ...tmp.body.children);
			this.dispatchEvent(new Event('ready'));
		});
	}

	async connectedCallback() {
		await this.ready();
		const {crossOrigin, referrerPolicy, decoding, hashes} = this;
		this.images = hashes.map(hash => {
			const img = document.createElement('picture', {is: 'imgur-img'});
			img.decoding = decoding;
			img.sizes = '5vw';
			img.referrerPolicy = referrerPolicy;
			img.crossOrigin = crossOrigin;
			img.hash = hash;
			img.classList.add('card', 'shadow', 'inline-block', 'cursor-pointer');
			img.addEventListener('click', () => this.activeImage = img);
			return img;
		});
		this.shadowRoot.querySelector('button[data-click="prev"]').addEventListener('click', () => {
			this.activeImage = this.previousImage;
		});
		this.shadowRoot.querySelector('button[data-click="next"]').addEventListener('click', () => {
			this.activeImage = this.nextImage;
		});
		for await (const img of this.imageGen()) {
			this.activeImage = img;
		}
	}

	get images() {
		return this.shadowRoot.querySelector('slot[name="gallery"]').assignedNodes();
	}

	set images(images) {
		this.images.forEach(img => img.remove());
		if (Array.isArray(images) && images.every(img => img instanceof HTMLPictureElement)) {
			images.forEach(img => img.slot = 'gallery');
			this.append(...images);
		}
	}

	get activeImage() {
		const slot = this.shadowRoot.querySelector('slot[name="active-image"]');
		const imgs = slot.assignedNodes();
		if (imgs.length === 1) {
			return imgs[0];
		} else {
			return null;
		}
	}

	set activeImage(image) {
		const current = this.currentImage;
		if (current instanceof Element) {
			current.classList.remove('active');
		}
		image.classList.add('active');
		const clone = image.cloneNode(true);
		const active = this.activeImage;
		clone.classList.remove('active');
		clone.slot = 'active-image';
		clone.sizes = this.sizes;
		clone.hidden = true;
		this.append(clone);

		new Promise(resolve => {
			const img = clone.querySelector('img');
			if (img.complete) {
				resolve();
			} else {
				img.addEventListener('load', () => {
					resolve();
				}, {once: true});
			}
		}).then(() => {
			if (active instanceof HTMLElement) {
				active.remove();
			}
			clone.hidden = false;
			this.dispatchEvent(new CustomEvent('change'), {detail: clone});
		});
	}

	get hashes() {
		return this.getAttribute('hashes').split(',').map(hash => hash.trim());
	}

	set hashes(hashes) {
		if (Array.isArray(hashes)) {
			this.setAttribute('hashes', hashes.join(', '));
		} else {
			throw new TypeError('hashes must be an array of hashes');
		}
	}

	get decoding() {
		return this.getAttribute('decoding') || 'auto';
	}

	set decoding(decoding) {
		this.setAttribute('decoding', decoding);
	}

	get referrerPolicy() {
		return this.getAttribute('referrerpolicy') || 'no-referrer-when-downgrade';
	}

	set referrerPolicy(policy) {
		this.setAttribute('referrerpolicy', policy);
	}

	get crossOrigin() {
		return this.getAttribute('crossorigin') || 'anonymous';
	}

	set crossOrigin(crossorigin) {
		this.setAttribute('crossorigin', crossorigin);
	}

	get sizes() {
		return this.getAttribute('sizes');
	}

	set sizes(sizes) {
		this.setAttribute('sizes', sizes);
	}

	get delay() {
		return parseInt(this.getAttribute('delay')) || 3000;
	}

	set delay(delay) {
		this.setAttribute('delay', delay);
	}

	get reverse() {
		return this.hasAttribute('reverse');
	}

	set reverse(reverse) {
		this.toggleAttribute('reverse', reverse);
	}

	get currentImage() {
		return this.images.find(img => img.classList.contains('active'));
	}

	get nextImage() {
		const current = this.currentImage;
		const images = this.images;
		if (current instanceof HTMLElement) {
			current.classList.remove('active');
			const next = current.nextElementSibling;

			if (next instanceof HTMLElement && next.slot === 'gallery') {
				next.classList.add('active');
				return next;
			} else {
				images[0].classList.add('active');
				return images[0];
			}
		} else {
			images[0].classList.add('active');
			return images[0];
		}
	}

	get previousImage() {
		const current = this.currentImage;
		const images = this.images;
		const last = images[images.length - 1];
		if (current instanceof HTMLElement) {
			current.classList.remove('active');
			const prev = current.previousElementSibling;

			if (prev instanceof HTMLElement && prev.slot === 'gallery') {
				prev.classList.add('active');
				return prev;
			} else {
				last.classList.add('active');
				return last;
			}
		} else {
			last.classList.add('active');
			return last;
		}
	}

	async imgChanged() {
		await new Promise(resolve => this.addEventListener('change', () => resolve(), {once: true}));
	}

	async *imageGen() {
		await this.ready();
		while (true) {
			yield this.nextImage;
			await this.imgChanged();
			await wait(this.delay);
			await pageVisible();
		}
	}

	async ready() {
		await new Promise(resolve => {
			if (this.shadowRoot.childElementCount === 0) {
				this.addEventListener('ready', () => resolve());
			} else {
				resolve();
			}
		});
	}

	async attributeChangedCallback(name, oldValue, newValue) {
		switch(name) {
			default:
				console.log({name, oldValue, newValue});
		}
	}
}

registerCustomElement('imgur-gallery', HTMLImgurGalleryElement);
