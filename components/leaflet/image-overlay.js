import { imageOverlay } from 'https://unpkg.com/leaflet@1.7.1/dist/leaflet-src.esm.js';
const map = new Map();
import { registerCustomElement } from '../../js/std-js/custom-elements.js';

registerCustomElement('leaflet-image-overlay', class HTMLLeafletImageOverlayElement extends HTMLElement {
	constructor() {
		super();
		this._map = null;
		this._shadow = this.attachShadow({mode: 'closed'});
		const slot = document.createElement('slot');
		slot.name = 'image';
		this._shadow.append(slot);
	}

	async connectedCallback() {
		const closestMap = this.closest('leaflet-map');
		if (closestMap instanceof HTMLElement) {
			await customElements.whenDefine('leaflet-map');
			await closestMap.ready;
			this._map = closestMap;

			if (! map.has(this)) {
				map.set(this, await this._make());
			}

			if (! this.hidden) {
				await this._map.ready;
				map.get(this).addTo(this._map.map);
			}
		}
	}

	async disconnectedCallback() {
		if (this._map instanceof HTMLElement) {
			await this._map.ready;
			const marker = map.get(this);
			marker.remove();
			map.delete(this);
			this._map = null;
		}
	}

	get bounds() {
		if (this.hasAttribute('bounds')) {
			const bounds = this.getAttribute('bounds').split('|').map(crds => crds.split(',').map(crd => parseFloat(crd)));

			return bounds.length > 1 && bounds.every(bnd => Array.isArray(bnd) && bnd.every(crd => Number.isFinite(crd))) ? bounds : null;
		} else {
			return null;
		}
	}

	set bounds(val) {
		if (Array.isArray(val)) {
			this.setAttribute('bounds', /* */);
		} else {
			throw new Error('Bounds must be an array');
		}
	}

	get image() {
		const slot = this._shadow.querySelector('slot[name="image"]');
		const nodes = slot.assignedNodes();
		if (nodes.length === 1 && nodes[0] instanceof HTMLElement) {
			const img = nodes[0];
			if (img.tagName === 'TEMPLATE') {
				return img.cloneNode(true).firstElementChild;
			} else {
				return img;
			}
		} else {
			return null;
		}
	}

	set image(img) {
		const current = this.image;
		if (current instanceof HTMLElement) {
			current.remove();
		}

		if (img instanceof HTMLImageElement) {
			img.slot = 'image';
			this.append(img);
		} else {
			throw new Error('Expected an <img>');
		}
	}

	async _make() {
		const { _map, image, bounds } = this;

		if (Array.isArray(bounds) && (image instanceof HTMLImageElement) && (_map instanceof HTMLElement)) {
			await _map.ready;
			const {alt, crossOrigin, className} = image;
			const layer = imageOverlay(image.currentSrc || image.src, bounds, { alt, crossOrigin, className });
			map.set(this, layer);
			return layer;
		} else {
			return null;
		}
	}

	attributeChangedCallback(name) {
		const marker = map.get(this);
		if (marker) {
			switch(name) {
				case 'hidden':
					if (this.hidden) {
						marker.remove();
					} else if (this._map instanceof HTMLElement) {
						this._map.ready.then(el => marker.addTo(el.map));
					}
					break;

				default:
					throw new Error(`Unhandled attribute changed: ${name}`);
			}
		}
	}

	static get observedAttributes() {
		return [
			'hidden',
		];
	}
});
