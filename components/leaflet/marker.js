import { marker, icon, latLng } from './dist.js';
import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { parse } from '../../js/std-js/dom.js';
import { getJSON } from '../../js/std-js/http.js';
import { debounce } from '../../js/std-js/utility.js';
import { watch as watchLocation, get as findLocation } from '../../js/std-js/geo.js';
import { clamp } from '../../js/std-js/math.js';
import { getSchemaIcon } from './schema-icon.js';
import { MARKER_TYPES } from './marker-types.js';
import { getFloat, setFloat, getBool, setBool, getInt, setInt } from '../../js/std-js/attrs.js';

const data = new WeakMap();
const controllers = new WeakMap();
const updaters = new WeakMap();

function filterTypes(types) {
	if (Array.isArray(types)) {
		return [...new Set(types)].filter(type => MARKER_TYPES.includes(type));
	} else if (types instanceof Set) {
		return filterTypes([...types]);
	} else if (typeof types === 'string') {
		return filterTypes(types.split(' '));
	} else {
		return [];
	}
}

export const DEFAULT_ICON = {
	iconUrl: 'https://cdn.kernvalley.us/img/markers.svg#map-marker',
	iconSize: [24, 24],
	crossOrigin: 'anonymous',
};

registerCustomElement('leaflet-marker', class HTMLLeafletMarkerElement extends HTMLElement {
	constructor({
		icon: iconArg = null, popup = null, latitude = null, longitude = null,
		open = null, minZoom = null, maxZoom = null,
	} = {}) {
		super();
		this._map = null;
		this._shadow = this.attachShadow({ mode: 'open' });
		const popupEl = document.createElement('slot');
		const iconEl = document.createElement('slot');

		popupEl.name = 'popup';
		iconEl.name = 'icon';

		popupEl.addEventListener('slotchange', debounce(async () => {
			const slotted = popupEl.assignedElements();

			if (data.has(this) && slotted.length !== 0) {
				data.get(this).bindPopup(slotted[slotted.length - 1].innerHTML);
			}
		}));

		iconEl.addEventListener('slotchange', debounce(async () => {
			const slotted = iconEl.assignedElements();

			if (data.has(this) && slotted.length !== 0) {
				const { src: iconUrl, height, width, crossOrigin } = slotted[slotted.length - 1];
				const iconSize = [height, width];
				data.get(this).setIcon(icon({ iconUrl, iconSize, crossOrigin }));
			} else if (data.has(this)) {
				data.get(this).setIcon(icon(DEFAULT_ICON));
			}
		}, { delay: 50 }));

		this._shadow.append(popupEl, iconEl);

		if (typeof iconArg === 'string' || iconArg instanceof HTMLElement) {
			this.iconImg = iconArg;
		}

		if (popup) {
			this.popup = popup;
		}

		this.addEventListener('connected', () => {
			this.slot = 'markers';

			if (typeof latitude === 'number' || typeof latitude === 'string') {
				this.latitude = latitude;
			}

			if (typeof longitude === 'number' || typeof longitude === 'string') {
				this.longitude = longitude;
			}

			if (typeof open === 'boolean') {
				this.open = open;
			}

			if (Number.isInteger(minZoom)) {
				this.minZoom = minZoom;
			}

			if (Number.isInteger(maxZoom)) {
				this.maxZoom = maxZoom;
			}
		}, { once: true });
	}

	async connectedCallback() {
		const prom = this.whenConnected;
		this.dispatchEvent(new Event('connected'));
		await prom;
		const closestMap = this.closest('leaflet-map');

		if (closestMap instanceof HTMLElement) {
			await customElements.whenDefined('leaflet-map');
			const mapEl = await closestMap.ready;
			this._map = closestMap;

			if (! data.has(this)) {
				data.set(this, await this._make());
				this.dispatchEvent(new Event('ready'));
			}

			if (! this.hidden) {
				const marker = data.get(this);
				marker.addTo(mapEl.map);

				if (this.open) {
					setTimeout(() => marker.openPopup(), 500);
				}
			}
		}
	}

	async disconnectedCallback() {
		if (this._map instanceof HTMLElement) {
			await this._map.ready;
			const marker = data.get(this);
			marker.remove();
			data.delete(this);
			this._map = null;

			if (controllers.has(this)) {
				controllers.get(this).abort(new DOMException('Marker disconnected.'));
				controllers.delete(this);
			}
		}
	}

	toJSON() {
		const {latitide, longitude, title} = this;
		return {latitide, longitude, title};
	}

	get ready() {
		if (data.has(this)) {
			return Promise.resolve();
		} else {
			return new Promise(resolve => this.addEventListener('ready', () => resolve(), { once: true }));
		}
	}

	get geo() {
		const { latitude, longitude } = this;
		return { latitude, longitude };
	}

	set geo({ latitude, longitude }) {
		if (typeof latitude === 'number' && typeof longitude === 'number') {
			this.latitude = latitude;
			this.longitude = longitude;
		} else {
			throw new TypeError('latitude and longitude must be numbers');
		}
	}

	get latLng() {
		const { latitude, longitude } = this;
		return new latLng({ lat: latitude, lng: longitude });
	}

	get latitude() {
		return getFloat(this, 'latitude');
	}

	set latitude(val) {
		setFloat(this, 'latitude', val);
	}

	get longitude() {
		return getFloat(this, 'longitude');
	}

	set longitude(val) {
		setFloat(this, 'longitude', val);
	}

	get minZoom() {
		return getInt(this, 'minzoom', { min: 0 });
	}

	set minZoom(val) {
		setInt(this, 'minzoom', val);
	}


	get maxZoom() {
		return getInt(this, 'maxzoom');
	}

	set maxZoom(val) {
		setInt(this, 'maxzooom', val);
	}

	get iconImg() {
		const slot = this._shadow.querySelector('slot[name="icon"]');
		const nodes = slot.assignedNodes();
		return nodes.length === 1 ? nodes[0] : null;
	}

	/**
	 * @TODO support SVG icons
	 */
	set iconImg(val) {
		const current = this.iconImg;
		if (current instanceof HTMLImageElement) {
			current.remove();
		}

		if (typeof val === 'string' && val !== '') {
			const img = new Image(22, 22);
			img.crossOrigin = 'anonymous';
			img.referrerPolicy = 'no-referrer';
			img.loading = 'lazy';
			img.decoding = 'async';
			img.src = val;
			img.slot = 'icon';
			this.append(img);
		} else if (val instanceof HTMLImageElement) {
			val.slot = 'icon';
			this.append(val);
		}
	}

	get popup() {
		const slot = this._shadow.querySelector('slot[name="popup"]');
		const nodes = slot.assignedNodes();
		const popup = nodes.length === 1 ? nodes[0] : null;

		if (! (popup instanceof HTMLElement)) {
			return null;
		} else if (popup.tagName === 'TEMPLATE') {
			const container = document.createElement('div');
			container.append(popup.content.cloneNode(true));
			return container;
		} else {
			return popup;
		}
	}

	set popup(val) {
		if (val instanceof HTMLElement) {
			val.slot = 'popup';
			const current = this.popup;

			if (current instanceof HTMLElement) {
				current.replaceWith(val);
			} else {
				this.append(val);
			}
		} else if (val instanceof DocumentFragment) {
			const container = document.createElement('div');
			container.append(val);
			this.popup = container;
		} else if (HTMLElement.setHTML instanceof Function) {
			const el = document.createElement('div');
			el.setHTML(val, { sanitizer: new globalThis.Sanitizer() });
			el.slot = 'popup';
			this.popup = el;
		} else {
			this.popup = parse(val);
		}
	}

	get opacity() {
		return clamp(0, getFloat(this, 'opacity', { fallback: 1 }), 1);
	}

	set opacity(val) {
		setInt(this, 'opacity', val, { min: 0, max: 1 });
	}

	get open() {
		return getBool(this, 'open');
	}

	set open(val) {
		setBool(this, 'open', val);
	}

	get visible() {
		const map = this.closest('leaflet-map');
		return map instanceof HTMLElement && map.containsMarker(this);
	}

	get whenConnected() {
		if (this.isConnected) {
			return Promise.resolve();
		} else {
			return new Promise(resolve => this.addEventListener('connect', () => resolve(), { once: true }));
		}
	}

	async find({ enableHighAccuracy = true, maximumAge = 0, timeout, signal } = {}) {
		const [{ coords }] = await Promise.all([
			findLocation({ enableHighAccuracy, maximumAge, timeout, signal }),
			this.ready,
		]);

		this.geo = coords;
		this.parentElement.flyTo(coords);
	}

	async watch({ delay = 500, enableHighAccuracy = true, errorHandler = console.error, maximumAge = 0, timeout, signal } = {}) {
		const controller = new AbortController();

		if (signal instanceof AbortSignal) {
			if (signal.aborted) {
				controller.abort(signal.reason || new DOMException('Operation aborted.'));
			} else {
				signal.addEventListener('abort', ({ target }) => {
					if (controllers.has(this)) {
						controllers.get(this).abort(target.reason || new DOMException('Operation aborted.'));
					}
				}, { signal: controller.signal, once: true });
			}
		}

		if (controller.signal.aborted) {
			throw controller.signal.reason || new DOMException('Operation aborted.');
		} else {
			controllers.set(this, controller);
			watchLocation(
				debounce(({ coords }) =>  {
					this.geo = coords;
					this.parentElement.flyTo(coords);
				}, { delay }),
				err => errorHandler(err),
				{ enableHighAccuracy, maximumAge, timeout, signal: controller.signal },
			);
		}
	}

	_make() {
		const { latitude = 0, longitude = 0, title, iconImg, popup } = this;
		const eventDispatcher = ({ containerPoint, latlng, originalEvent, type }) => {
			this.dispatchEvent(new CustomEvent(`marker${type}`, {detail: {
				coordinates: {
					latitude: latlng.lat,
					longitude: latlng.lng,
					x: containerPoint.x,
					y: containerPoint.y,
				},
				originalEvent,
			}}));
		};
		let m;

		if (iconImg instanceof HTMLImageElement) {
			m = marker(
				[latitude, longitude],
				{
					title,
					riseOnHover: true,
					icon: icon({
						iconUrl: iconImg.src,
						iconSize: [iconImg.height || 32, iconImg.width || 32],
						crossOrigin: iconImg.crossOrigin,
					})
				}
			);
		} else {
			m = marker(
				[latitude, longitude],
				{
					title,
					riseOnHover: true,
					icon: icon(DEFAULT_ICON),
				}
			);
		}

		m.on('click', eventDispatcher);
		m.on('dblclick', eventDispatcher);
		m.on('mousedown', eventDispatcher);
		m.on('mouseup', eventDispatcher);
		m.on('mouseover', eventDispatcher);
		m.on('mouseout', eventDispatcher);
		m.on('contextmenu', eventDispatcher);

		if (popup instanceof HTMLElement) {
			if ('part' in popup) {
				popup.part.add('popup');
			}
			m.bindPopup(popup);
			m.on('popupopen', () => this.open = true);

			m.on('popupclose', () => this.open = false);
		}

		return m;
	}

	async attributeChangedCallback(name, oldVal, newVal) {
		await this.ready;
		const marker = data.get(this);

		if (marker) {
			switch(name) {
				case 'hidden':
					if (this.hidden) {
						marker.remove();
					} else if (this._map instanceof HTMLElement) {
						this._map.ready.then(() => marker.addTo(this._map.map));
					}
					break;

				case 'open':
					if (this._map instanceof HTMLElement) {
						this._map.ready.then(() => {
							const marker = data.get(this);
							const open = this.open;
							const isOpen = marker.isPopupOpen();

							if (open && ! isOpen) {
								marker.openPopup();
							} else if (! open && isOpen) {
								marker.closePopup();
							}

							this.dispatchEvent(new Event(open ? 'open' : 'close'));
						});
					}
					break;

				case 'latitude':
				case 'longitude':
					if (data.has(this) && typeof newVal === 'string' && newVal.length !== 0) {
						const marker = data.get(this);
						const { latitude, longitude } = this;

						if (updaters.has(this)) {
							clearTimeout(updaters.get(this));
						}

						updaters.set(this, setTimeout(() => {
							marker.setLatLng(new latLng({ lat: latitude, lng: longitude }));
							updaters.delete(this);
						}), 17);
					}
					break;

				case 'opacity':
					if (data.has(this) && typeof newVal === 'string' && newVal.length !== 0) {
						data.get(this).setOpacity(clamp(0, parseFloat(newVal), 1));
					} else if (data.has(this)) {
						data.get(this).setOpacity(1);
					}
					break;

				default:
					throw new Error(`Unhandled attribute changed: ${name}`);
			}
		}
	}

	distanceTo({ latitude, longitude, altitude }) {
		const pt = new latLng({ lat: latitude, lng: longitude, alt: altitude });
		return this.latLng.distanceTo(pt);
	}

	distanceToMarker(marker) {
		return this.latLng.distanceTo(marker.latLng);
	}

	static async getSchemaIcon(...args) {
		return await getSchemaIcon(...args);
	}

	static async getMarkers(...types) {
		async function callback(markers) {
			return await markers.map(async marker => {
				const markerEl = new HTMLLeafletMarkerElement({
					latitude: 'geo' in marker ? marker.geo.latitude : marker.location.geo.latitude,
					longitude: 'geo' in marker ? marker.geo.longitude : marker.location.geo.longitude,
					popup: `<h3>${marker.name}</h3>`,
					icon: await HTMLLeafletMarkerElement.getSchemaIcon(marker),
				});

				if (typeof marker.identifier === 'string') {
					markerEl.id = marker.identifier;
					markerEl.title = marker.name;
				}

				return markerEl;
			});
		}

		function hasGeo(marker) {
			if ('location' in marker && 'geo' in marker.location) {
				return 'longitude' in marker.location.geo && 'latitude' in marker.location.geo;
			} else if ('geo' in marker) {
				return 'longitude' in marker.geo && 'latitude' in marker.geo;
			}
		}

		return await Promise.all(filterTypes(types).map(type => {
			return getJSON(`https://maps.kernvalley.us/places/${type}.json`)
				.then(markers => callback(markers.filter(hasGeo)));
		})).then(markers => Promise.all(markers.flat()));

	}

	static get observedAttributes() {
		return [
			'open',
			'hidden',
			'latitude',
			'longitude',
			'opacity',
		];
	}
});
