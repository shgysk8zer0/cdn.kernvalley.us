import { getLocation } from '../../js/std-js/functions.js';
import HTMLCustomElement from '../custom-element.js';
import {
	map as LeafletMap,
	tileLayer as LeafletTileLayer
} from 'https://unpkg.com/leaflet@1.7.1/dist/leaflet-src.esm.js';

let map = new Map();

/**
 * @see https://leafletjs.com/reference-1.7.1.html#map-factory
 */
HTMLCustomElement.register('leaflet-map', class HTMLLeafletMapElement extends HTMLCustomElement {
	constructor({
		longitude    = NaN,
		latitude     = NaN,
		zoom         = NaN,
		crossOrigin  = null,
		detectRetina = null,
		loading      = null,
		zoomControl  = null,
		markers      = null,
	} = {}) {
		super();
		this._shadow = this.attachShadow({ mode: 'closed' });

		if (Array.isArray(markers)) {
			customElements.whenDefined('leaflet-marker').then(() => {
				const Marker = customElements.get('leaflet-marker');
				markers.forEach(marker => {
					if (marker instanceof Marker) {
						marker.slot = 'markers';
						this.append(marker);
					} else if ('longitude' in marker && 'latitude' in marker) {
						const el = new Marker(marker);
						el.slot = 'markers';
						this.append(el);
					}
				});
			});
		}

		Promise.resolve().then(() => {
			if (! Number.isNaN(latitude) && ! Number.isNaN(longitude)) {
				this.center = { latitude, longitude };
			}

			if (! Number.isNaN(zoom)) {
				this.zoom = zoom;
			}

			if (typeof zoomControl === 'boolean') {
				this.zoomControl = zoomControl;
			}

			if (typeof crossOrigin === 'string') {
				this.crossOrigin = crossOrigin;
			}

			if (typeof detectRetina === 'boolean') {
				this.detectRetina = detectRetina;
			}

			if (typeof loading === 'string') {
				this.loading = loading;
			}
		}).then(() => new Promise(res => setTimeout(() => res(), 500))).then(() => {
			Promise.allSettled([
				this.whenConnected,
				this.whenLoad,
			]).then(async () => {
				const resp = await fetch(new URL('./components/leaflet/map.html', HTMLCustomElement.base));
				const html = await resp.text();
				const parser = new DOMParser();
				const doc = parser.parseFromString(html, 'text/html');
				const stylesheets = [...doc.querySelectorAll('link[rel="stylesheet"][href]')].map(link => {
					return new Promise((resolve, reject) => {
						link.addEventListener('load', () => resolve(), {once: true});
						link.addEventListener('error', (event) => reject(event), {once: true});
						link.href = new URL(link.getAttribute('href'), resp.url);
					});
				});

				doc.querySelectorAll('slot[name]').forEach(slot => {
					slot.addEventListener('slotchange', ({target}) => {
						this.dispatchEvent(new CustomEvent('change', {
							detail: {
								slot: target.name,
								nodes: target.assignedElements(),
							}
						}));
					});
				});

				this._shadow.append(...doc.head.children, ...doc.body.children);
				await Promise.all(stylesheets);
				this.dispatchEvent(new Event('populated'));

				new MutationObserver(async (mutations) => {
					const changes = {
						markers:  {added: [], removed: []},
						overlays: {added: [], removed: []},
						geojson:  {added: [], removed: []},
					};

					mutations.forEach(({ type, addedNodes, removedNodes }) => {
						if (type === 'childList') {
							[...addedNodes].forEach(el => {
								const slot = el.slot.toLowerCase();
								if (typeof slot === 'string' && changes.hasOwnProperty(slot)) {
									changes[slot].added.push(el);
								}
							});

							[...removedNodes].forEach(el => {
								const slot = el.slot.toLowerCase();
								if (typeof slot === 'string' && changes.hasOwnProperty(slot)) {
									changes[slot].removed.push(el);
								}
							});

							const { markers, overlays, geojson } = changes;

							if (markers.added.length !== 0 || markers.removed.length !== 0) {
								this.dispatchEvent(new CustomEvent('markerchange', {detail: {
									added: markers.added,
									removed: markers.removed,
								}}));
							}

							if (overlays.added.length !== 0 || overlays.removed.length !== 0) {
								this.dispatchEvent(new CustomEvent('overlaychange', {detail: {
									added: overlays.added,
									removed: overlays.removed,
								}}));
							}

							if (geojson.added.length !== 0 || geojson.removed.length !== 0) {
								this.dispatchEvent(new CustomEvent('geojsonchange', {detail: {
									added: geojson.added,
									removed: geojson.removed,
								}}));
							}
						}
					});
				}).observe(this, {
					childList: true,
					subtree: true,
					attributes: false,
					characterData: false,
				});
			});
		});
	}

	async connectedCallback() {
		const prom = this.whenConnected;
		this.dispatchEvent(new Event('connected'));

		await Promise.all([ this._populated, prom ]);
		const m = LeafletMap(this.mapElement, {
			zoomControl: this.zoomControl,
		});

		const handler = ({ type, target }) => {
			const event = type === 'move' ? 'pan': 'zoom';
			const { lat: latitude, lng: longitude } = target.getCenter();
			const { _northEast: ne, _southWest: sw } = target.getBounds();
			const bounds = [
				{ latitude: ne.lat, longitude: ne.lng },
				{ latitude: sw.lat, longitude: sw.lng },
			];
			const zoom = target.getZoom();
			const detail = { center: { latitude, longitude }, zoom, bounds };
			this.dispatchEvent(new CustomEvent(event, { detail }));
		};

		m.on({
			move: handler,
			zoom: handler,
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

		LeafletTileLayer(this.tileSrc, {
			attribution: this.attribution,
			crossOrigin: this.crossOrigin,
			detectRetina: this.detectRetina,
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

	get crossOrigin() {
		return this.getAttribute('crossorigin') || 'anonymous';
	}

	set crossOrigin(val) {
		this.setAttribute('crossorigin', val);
	}

	get detectRetina() {
		return this.hasAttribute('detectretina');
	}

	set detectRetina(val) {
		this.toggleAttribute('detectretina', val);
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
			const [latitude = NaN, longitude = NaN] = this.getAttribute('center').split(',', 2).map(parseFloat);
			return { latitude, longitude };
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
		/* https://{s}.tile.openstreetmap.org/{z}/{x}/{y}{r}.png */
		/* https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}{r}.png */
		return this.getAttribute('tilesrc') || HTMLLeafletMapElement.wikimedia;
	}

	get toolbar() {
		return this.hasAttribute('toolbar');
	}

	set toolbar(val) {
		this.toggleAttribute('toolbar', val);
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

	get geoJson() {
		if (this._shadow.childElementCount === 0) {
			return [];
		} else {
			const slot = this._shadow.querySelector('slot[name="geojson"]');
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

	async filterMarkers(callback) {
		await this.ready;
		if (callback instanceof Function) {
			return this.markers.filter(callback);
		}
	}

	async addMarker({ latitude, longitude, icon, title, popup, center = false, open = false }) {
		await customElements.whenDefined('leaflet-marker');
		const Marker = customElements.get('leaflet-marker');
		const marker = new Marker({ icon, popup });

		if (typeof title === 'string') {
			marker.title = title;
		}

		marker.latitude = latitude;
		marker.longitude = longitude;

		this.append(marker);

		if (center) {
			this.center = marker;
		}

		marker.open = open;
		return marker;
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

	async attributeChangedCallback(name, oldVal, newVal) {
		switch (name) {
			case 'zoom':
				this.ready.then(() => this.map.setZoom(this.zoom));
				break;

			case 'center':
				this.ready.then(() => this.setCenter(this.center));
				break;

			case 'loading':
				this.lazyLoad(newVal === 'lazy');
				break;

			default:
				throw new Error(`Unhandled attribute changed: ${name}`);
		}
	}

	static get observedAttributes() {
		return [
			'zoom',
			'center',
			'loading',
		];
	}

	static get wikimedia() {
		return 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}{r}.png';
	}

	static get osm() {
		return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}{r}.png';
	}
});
