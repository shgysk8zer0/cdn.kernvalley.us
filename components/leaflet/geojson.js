import {geoJSON} from 'https://unpkg.com/leaflet@1.5.1/dist/leaflet-src.esm.js';

customElements.define('leaflet-geojson', class HTMLLeafletGeoJSONElement extends HTMLElement {
	get color() {
		return this.getAttribute('color') || '#ff7800';
	}

	set color(val) {
		this.setAttribuite('color', val);
	}

	get fill() {
		return this.hasAttribute('fill');
	}

	set fill(val) {
		this.toggleAttribute('fill', val);
	}

	get opacity() {
		return this.hasAttribute('opacity') ? parseFloat(this.getAttribute('opacity')) : 1;
	}

	set opacity(val) {
		this.setAttribute('opacity', val);
	}

	get src() {
		return new URL(this.getAttribute('src'), document.baseURI);
	}

	set src(val) {
		this.setAttribute('src', val);
	}

	get stroke() {
		return this.hasAttribute('stroke');
	}

	set stroke(val) {
		this.toggleAttribute('stroke', val);
	}

	get weight() {
		return this.hasAttribute('weight') ? parseInt(this.getAttribute('weight')) : 5;
	}

	set weight(val) {
		this.setAttribute('weight', val);
	}

	async attributeChangedCallback(name, oldVal, newVal) {
		switch(name) {
		case 'src':
			console.info({oldVal, newVal});
			fetch(this.src).then(async resp => {
				const json = await resp.json();
				const {color, weight, fill, opacity, stroke} = this;
				setTimeout(() => geoJSON(json, {style: {color, weight, fill, opacity, stroke}})
					.addTo(this.parentElement.map), 500);

			});
			break;

		default:
			throw new Error(`Invalid attribute changed: ${name}`);
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

	static get observedAttributes() {
		return [
			'color',
			'fill',
			'hidden',
			'opacity',
			'src',
			'stroke',
			'weight',
		];
	}
});
