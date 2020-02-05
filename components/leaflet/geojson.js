import {geoJSON} from 'https://unpkg.com/leaflet@1.6.0/dist/leaflet-src.esm.js';
const map = new Map();

customElements.define('leaflet-geojson', class HTMLLeafletGeoJSONElement extends HTMLElement {
	constructor() {
		super();
		this._map = null;
	}

	get color() {
		return this.getAttribute('color') || '#ff7800';
	}

	set color(val) {
		this.setAttribute('color', val);
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

	get ready() {
		return new Promise(resolve => {
			if ( map.has(this)) {
				resolve();
			} else {
				this.addEventListener('ready', () => resolve(), {once: true});
			}
		});
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
		await this.ready;
		const path = map.get(this);
		switch(name) {
		case 'color':
			path.setStyle({color: this.color});
			break;

		case 'fill':
			path.setStyle({fill: this.fill});
			break;

		case 'hidden':
			if (this.hidden) {
				path.remove();
			} else if (this._map instanceof HTMLElement) {
				path.addTo(this._map.map);
			}
			break;

		case 'opacity':
			path.setStyle({opacity: this.opacity});
			break;

		case 'stroke':
			path.setStyle({stroke: this.stroke});
			break;

		case 'src':
			// console.info({oldVal, newVal});
			// fetch(this.src).then(async resp => {
			// 	const data = await resp.json();
			// 	path.addData(data);
			// });
			this.dispatchEvent(new CustomEvent('srcchange', {detail: {oldVal, newVal}}));
			break;

		case 'weight':
			path.setStyle({weight: this.weight});
			break;

		default:
			throw new Error(`Invalid attribute changed: ${name}`);
		}
	}

	async connectedCallback() {
		const closestMap = this.closest('leaflet-map');
		if (closestMap instanceof HTMLElement) {
			await customElements.whenDefined('leaflet-map');
			await closestMap.ready;
			this._map = closestMap;

			if (! map.has(this)) {
				map.set(this, await this._make());
				this.dispatchEvent(new Event('ready'));
			}

			if (! this.hidden) {
				await this._map.ready;
				const path = map.get(this);
				path.addTo(this._map.map);
			}
		}
	}

	async disconnectedCallback() {
		if (this._map instanceof HTMLElement) {
			await this._map.ready;
			const path = map.get(this);
			path.remove();
			map.delete(this);
			this._map = null;
		}
	}

	async _make() {
		const { _map, fill, weight, color, opacity, stroke } = this;
		const src = await this.srcWhenSet();
		const resp = await fetch(src);
		const json = await resp.json();

		if (_map instanceof HTMLElement) {
			await _map.ready;

			const path = geoJSON(json || {}, {style: {color, weight, fill, opacity, stroke}});
			return path;
		} else {
			return null;
		}
	}

	async srcWhenSet() {
		return await new Promise(resolve => {
			if (this.hasAttribute('src')) {
				resolve(this.src);
			} else {
				this.addEventListener('srcchange', () => resolve(this.src), {once: true});
			}
		});
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
