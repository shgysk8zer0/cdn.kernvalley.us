// @TODO Only import what is needed from Leaflet
import { meta } from '../../import.meta.js';
import * as Leaflet from 'https://unpkg.com/leaflet@1.6.0/dist/leaflet-src.esm.js';
import HTMLMapMarkerElement from './map-marker.js';
import HTMLImageOverlayElement from './image-overlay.js';
import { getLocation } from '../js/std-js/functions.js';

let map = new Map();

customElements.define(HTMLMapMarkerElement.tagName, HTMLMapMarkerElement);
customElements.define(HTMLImageOverlayElement.tagName, HTMLImageOverlayElement);

/**
 * @see https://leafletjs.com/reference-1.5.0.html#map-factory
 */
export default class HTMLOpenStreetMapElement extends HTMLElement {
	constructor() {
		super();
		this._shadow = this.attachShadow({ mode: 'closed' });

		Promise.resolve().then(async () => {
			const resp = await fetch(new URL('./components/open-street-map.html', meta.url));
			const html = await resp.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');
			this._shadow.append(...doc.head.children, ...doc.body.children);
			this.dispatchEvent(new Event('populated'));
		});

		this._populated.then(() => console.info('populated'));
		this.ready.then(() => console.info('ready'));
	}

	async connectedCallback() {
		await this._populated;
		const m = Leaflet.map(this.mapElement, {
			zoomControl: this.zoomControl,
			tap: false,
		});

		const { latitude, longitude } = this.center;

		if (! Number.isNaN(latitude) && ! Number.isNaN(longitude)) {
			m.setView([latitude, longitude], this.zoom);
		} else if (await this.hasGeoPermission()) {
			const { latitude, longitude } = await this.coords;
			m.setView([latitude, longitude], this.zoom);
		} else {
			// It's Disneyland
			m.setView([33.811137945997444, -117.91675329208375], this.zoom);
		}

		Leaflet.tileLayer(this.tileSrc, {
			attribution: this.attribution,
			minZoom: this.minZoom,
			maxZoom: this.maxZoom,
			label: 'OpenStreetMap',
		}).addTo(m);

		map.set(this, m);

		this.dispatchEvent(new Event('ready'));
	}

	disconnectedCallback() {
		map.delete(this);
	}

	get ready() {
		return new Promise(async resolve => {
			await this._populated;
			if (! map.has(this)) {
				this.addEventListener('ready', () => {
					this.map.whenReady(() => resolve(this));
				}, {
					once: true
				});
			} else {
				resolve(this);
			}
		});
	}

	get _populated() {
		return new Promise(async resolve => {
			if (this._shadow.childElementCount === 0) {
				this.addEventListener('populated', () => resolve(this), {
					once: true
				});
			} else {
				resolve(this);
			}
		});
	}

	get zoom() {
		return parseInt(this.getAttribute('zoom')) || 13;
	}

	set zoom(val) {
		const num = parseInt(val);
		if (Number.isNaN(num)) {
			throw new Error(`Invalid zoom: ${val}`);
		} else {
			this.setAttribute('zoom', num);
		}
	}

	get minZoom() {
		return parseInt(this.getAttribute('minzoom')) || 1;
	}

	set minZoom(val) {
		this.setAttribute('minzoom', val);
	}

	get maxZoom() {
		return parseInt(this.getAttribute('maxzoom')) || 20;
	}

	set maxZoom(val) {
		this.setAttribute('minzoom', val);
	}

	get center() {
		if (this.hasAttribute('center')) {
			const [latitude, longitude] = this.getAttribute('center').split(',');
			return {
				latitude: parseFloat(latitude),
				longitude: parseFloat(longitude),
			};
		} else {
			return {
				latitude: NaN,
				longitude: NaN,
			};
		}
	}

	set center({latitude, longitude}) {
		if (typeof latitude === 'number' && typeof longitude === 'number') {
			this.setAttribute('center', `${latitude},${longitude}`);
		} else {
			throw new Error('{latitude, longitude} must be numbers');
		}
	}

	get zoomControl() {
		return this.hasAttribute('zoomcontrol');
	}

	set zoomControl(val) {
		this.toggleAttribute('zoomcontrol', val);
	}

	get tileSrc() {
		if (this.hasAttribute('tilesrc')) {
			const url = new URL(this.getAttribute('tilesrc'));

			if (url.searchParams.has('token')) {
				url.searchParams.set('token', this.token);
			}

			return url.href;
		} else {
			return 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}{r}.png';
		}
	}

	get attribution() {
		const slot = this._shadow.querySelector('slot[name="attribution"]');
		const nodes = slot.assignedNodes();

		if (nodes.length === 1) {
			return nodes[0].outerHTML;
		} else {
			return slot.firstElementChild.outerHTML;
		}
	}

	get coords() {
		return getLocation({ enableHighAccuracy: true }).then(({ coords }) => {
			this.dispatchEvent(new CustomEvent('location', { details: coords }));
			return coords;
		});
	}

	get mapElement() {
		const slot = this._shadow.querySelector('slot[name="map"]');
		const nodes = slot.assignedNodes();
		return nodes.length === 1 ? nodes[0] : slot.firstElementChild;
	}

	set mapElement(el) {
		const slot = this._shadow.querySelector('slot[name="map"]');
		slot.assignedNodes().forEach(el => el.remove());
		el.slot = 'map';
		this.append(el);
	}

	async zoomIn() {
		this.map.zoomIn();
	}

	async zoomOut() {
		this.map.zoomOut();
	}

	async setCenter({ latitude, longitude, title = 'Center', icon = null, zoom = null }) {
		if (typeof latitude === 'number' && typeof longitude === 'number') {
			if (icon !== null) {
				await this.markers.remove(icon => icon.options.title === 'Center');
				await this.markers.add({
					coords: [latitude, longitude],
					options: { title, icon }
				});
			}

			this.map.setView([latitude, longitude], zoom || this.zoom);
		}
	}

	async flyTo({ latitude, longitude }, zoomlevel) {
		this.map.flyTo([latitude, longitude], zoomlevel);
	}

	async hasGeoPermission() {
		const { state } = await navigator.permissions.query({ name: 'geolocation' });
		return state === 'granted';
	}

	get map() {
		return map.get(this);
	}

	get overlays() {
		if (this._shadow.childElementCount === 0) {
			return [];
		} else {
			const slot = this._shadow.querySelector('slot[name="overlays"]');
			return slot.assignedNodes();
		}
	}

	get markers() {
		if (this._shadow.childElementCount === 0) {
			return [];
		} else {
			const slot = this._shadow.querySelector('slot[name="markers"]');
			return slot.assignedNodes();
		}
	}

	get token() {
		return this.getAttribute('token');
	}

	set token(val) {
		this.setAttribute('token', val);
	}

	async findLayer(callback) {
		await this.ready;
		return this.layers.find(callback);
	}

	async addLayers(/*...items*/) {
		await this.ready;
		return [];
		// layers.add(...items);
	}

	async removeLayer(callback) {
		return this.layers.remove(callback);
	}

	async clearLayers() {
		await this.ready;
		this.layers.clear();
	}

	static get tagName() {
		return 'open-street-map';
	}

	async filterMarkers(callback) {
		await this.ready;
		if (callback instanceof Function) {
			return this.markers.filter(callback);
		}
	}

	async findMarker(callback) {
		await this.ready;

		if (callback instanceof Function) {
			return this.markers.find(callback);
		} else {
			throw new Error('`findMarker` accepts a callback');
		}
	}

	async hideMarkers() {
		await this.ready;
		const markers = this.markers;
		markers.forEach(el => el.hidden = true);
		return markers;
	}

	async showMarkers() {
		await this.ready;
		const markers = this.markers;
		markers.forEach(el => el.hidden = false);
		return markers;
	}

	async clearMarkers() {
		await this.ready;
		const markers = this.markers;
		markers.forEach(el => el.remove());
		return markers;
	}

	async attributeChangedCallback(name) {
		switch (name) {
		case 'zoom':
			this.ready.then(() => this.map.setZoom(this.zoom));
			break;

		case 'center':
			this.ready.then(() => this.setCenter(this.center));
			break;

		default:
			throw new Error(`Unhandled attribute changed: ${name}`);
		}
	}

	static get observedAttributes() {
		return [
			'zoom',
			'center',
		];
	}
}
