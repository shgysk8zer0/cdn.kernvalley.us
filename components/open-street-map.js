// @TODO Only import what is needed from Leaflet
import * as Leaflet from 'https://unpkg.com/leaflet@1.6.0/dist/leaflet-src.esm.js';
import HTMLMapMarkerElement from './map-marker.js';
import { getLocation } from '../js/std-js/functions.js';

let map = null;

customElements.define(HTMLMapMarkerElement.tagName, HTMLMapMarkerElement);

/**
 * @see https://leafletjs.com/reference-1.5.0.html#map-factory
 */
export default class HTMLOpenStreetMapElement extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this._markers = new Map();

		const observer = new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				switch(mutation.type) {
				case 'childList':
					this.ready.then(async () => {
						mutation.addedNodes.forEach( el => {
							if (el.make instanceof Function) {
								const marker = el.make();
								this._markers.set(el, marker);
								marker.addTo(map);
							}
						});

						mutation.removedNodes.forEach(el => {
							const marker = this._markers.get(el);
							if (marker !== undefined) {
								marker.remove();
								this._markers.delete(el);
							}
						});
					});
					break;

				default:
					console.error(`Unhandled mutation type: ${mutation.type}`);
				}
			});
		});

		observer.observe(this, {
			childList: true,
		});

		Promise.resolve().then(async () => {
			const resp = await fetch(new URL('open-street-map.html', import.meta.url));
			const html = await resp.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');
			this.shadowRoot.append(...doc.head.children, ...doc.body.children);
			await this.init();

			this.markers.forEach(el => {
				if (el.make instanceof Function) {
					const marker = el.make();
					this._markers.set(el, marker);
					marker.addTo(map);
				}
			});
		});
	}

	get ready() {
		return new Promise(async resolve => {
			if (this.shadowRoot.childElementCount === 0) {
				this.addEventListener('ready', () => {
					this.map.whenReady(() => resolve());
				}, {
					once: true
				});
			} else {
				resolve();
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

	get zoomControl() {
		return this.hasAttribute('zoom-control');
	}

	set zoomControl(val) {
		this.toggleAttribute('zoom-control', val);
	}

	get tileSrc() {
		return this.getAttribute('tilesrc') || '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	}

	get attribution() {
		const slot = this.shadowRoot.querySelector('slot[name="attribution"]');
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
		const slot = this.shadowRoot.querySelector('slot[name="map"]');
		const nodes = slot.assignedNodes();
		return nodes.length === 1 ? nodes[0] : slot.firstElementChild;
	}

	set mapElement(el) {
		const slot = this.shadowRoot.querySelector('slot[name="map"]');
		slot.assignedNodes().forEach(el => el.remove());
		el.slot = 'map';
		this.append(el);
	}

	async zoomIn() {
		map.zoomIn();
	}

	async zoomOut() {
		map.zoomOut();
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

			map.setView([latitude, longitude], zoom || this.zoom);
		}
	}

	async flyTo({ latitude, longitude }, zoomlevel) {
		map.flyTo([latitude, longitude], zoomlevel);
	}

	async hasGeoPermission() {
		const { state } = await navigator.permissions.query({ name: 'geolocation' });
		return state === 'granted';
	}

	get map() {
		return map;
	}

	get layers() {
		return [];
		// return layers;
	}

	get markers() {
		return this.shadowRoot.querySelector('slot[name="markers"]').assignedNodes();
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

	async init() {
		map = Leaflet.map(this.mapElement, {
			zoomControl: this.zoomControl,
		});

		const { latitude, longitude } = await this.hasGeoPermission()
			? await this.coords
			: { latitude: 37.217206113254996, longitude: -119.33898925781251 };

		map.setView([latitude, longitude], 7);

		// this.layers.setMap(map);
		// this.markers.setMap(map);
		Leaflet.tileLayer(this.tileSrc, {
			attribution: this.attribution,
			maxZoon: 20,
			minZoom: 0,
			label: 'OpenStreetMap',
		}).addTo(map);

		// this.markers.add({
		// 	coords: [latitude, longitude],
		// 	options: {
		// 		title: 'Center',
		// 		icon: marker,
		// 	}
		// });

		this.dispatchEvent(new Event('ready'));
	}

	async connectedCallback() {
		this.addEventListener('click', this.init, { once: true });
	}

	async attributeChangedCallback(name) {
		switch (name) {
		case 'zoom':
			if (map !== null) {
				map.setZoom(this.zoom);
			}
			break;

		default:
			throw new Error(`Unhandled attribute changed: ${name}`);
		}
	}

	static get observedAttributes() {
		return [
			'zoom',
		];
	}
}
