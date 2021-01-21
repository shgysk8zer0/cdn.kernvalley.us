import { marker, icon } from 'https://unpkg.com/leaflet@1.7.1/dist/leaflet-src.esm.js';
import { registerCustomElement, parseHTML } from 'https://cdn.kernvalley.us/js/std-js/functions.js';
import { getJSON } from 'https://cdn.kernvalley.us/js/std-js/http.js';
import { getSchemaIcon } from './schema-icon.js';

const map = new WeakMap();
const zoomHandlers = new WeakMap();

registerCustomElement('leaflet-marker', class HTMLLeafletMarkerElement extends HTMLElement {
	constructor({ icon = null, popup = null, latitude = null, longitude = null,
		open = null, minZoom = null, maxZoom = null } = {}) {
		super();
		this._map = null;
		this._shadow = this.attachShadow({ mode: 'closed' });
		const popupEl = document.createElement('slot');
		const iconEl = document.createElement('slot');

		popupEl.name = 'popup';
		iconEl.name = 'icon';

		this._shadow.append(popupEl, iconEl);

		if (typeof icon === 'string' || icon instanceof HTMLElement) {
			this.iconImg = icon;
		}

		if (popup) {
			this.popup = popup;
		}

		this.addEventListener('connected', () => {
			this.slot   = 'markers';

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

			if (! map.has(this)) {
				map.set(this, await this._make());
				this.dispatchEvent(new Event('ready'));
			}

			if (! this.hidden) {
				const marker = map.get(this);
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
			const marker = map.get(this);
			marker.remove();
			map.delete(this);
			this._map = null;
		}
	}

	toJSON() {
		const {latitide, longitude, title} = this;
		return {latitide, longitude, title};
	}

	get ready() {
		if (map.has(this)) {
			return Promise.resolve();
		} else {
			return new Promise(resolve => this.addEventListener('ready', () => resolve(), { once: true }));
		}
	}

	get latitude() {
		return parseFloat(this.getAttribute('latitude'));
	}

	set latitude(val) {
		this.setAttribute('latitude', val);
	}

	get longitude() {
		return parseFloat(this.getAttribute('longitude'));
	}

	set longitude(val) {
		this.setAttribute('longitude', val);
	}

	get minZoom() {
		if (this.hasAttribute('minzoom')) {
			return parseInt(this.getAttribute('minzoom'));
		} else {
			return NaN;
		}
	}

	set minZoom(val) {
		if (Number.isInteger(val)) {
			this.setAttribute('minzoom', val);
		} else if (typeof val === 'string') {
			this.minZoom = parseInt(val);
		} else {
			this.removeAttribute('minzoom');
		}
	}


	get maxZoom() {
		if (this.hasAttribute('maxzoom')) {
			return parseInt(this.getAttribute('maxzoom'));
		} else {
			return NaN;
		}
	}

	set maxZoom(val) {
		if (Number.isInteger(val)) {
			this.setAttribute('maxzoom', val);
		} else if (typeof val === 'string') {
			this.minZoom = parseInt(val);
		} else {
			this.removeAttribute('maxzoom');
		}
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
		} else if (typeof val === 'string') {
			this.popup = parseHTML(val);
		}
	}

	get open() {
		return this.hasAttribute('open');
	}

	set open(val) {
		this.toggleAttribute('open', val);
	}

	get whenConnected() {
		if (this.isConnected) {
			return Promise.resolve();
		} else {
			return new Promise(resolve => this.addEventListener('connect', () => resolve(), { once: true }));
		}
	}

	_make() {
		const { latitude, longitude, title, iconImg, popup } = this;
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
			m = marker([latitude, longitude], {title, icon: icon({
				iconUrl: iconImg.src,
				iconSize: [iconImg.height || 32, iconImg.width || 32],
			})});
		} else {
			m = marker([latitude, longitude], {title});
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

	async attributeChangedCallback(name/*, oldVal, newVal*/) {
		await this.ready;
		const marker = map.get(this);

		if (marker) {
			switch(name) {
				case 'minzoom':
				case 'maxzoom':
					this.whenConnected.then(() => {
						const { minZoom, maxZoom } = this;
						const map = this.closest('leaflet-map');
						const zoom = map.map.getZoom();
						this.hidden = ! this.open && (zoom > maxZoom || zoom < minZoom);

						if (zoomHandlers.has(this)) {
							map.removeEventListener('zoom', zoomHandlers.get(this));
							zoomHandlers.delete(this);
						}

						if (! Number.isNaN(minZoom) || ! Number.isNaN(maxZoom)) {
							const handler = ({ detail: { zoom }}) => {
								if (! Number.isNaN(minZoom) && zoom < minZoom) {
									this.hidden = ! this.open;
								} else if (! Number.isNaN(maxZoom) && zoom > maxZoom) {
									this.hidden = ! this.open;
								} else {
									this.hidden = false;
								}
							};
							map.addEventListener('zoom', handler);
							zoomHandlers.set(this, handler);
						}
					});
					break;
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
							const marker = map.get(this);
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

				default:
					throw new Error(`Unhandled attribute changed: ${name}`);
			}
		}
	}

	static async getSchemaIcon(...args) {
		return await getSchemaIcon(...args);
	}

	static async getMarkers(...types) {
		async function callback(markers) {
			return await markers.map(async marker => {
				return new HTMLLeafletMarkerElement({
					latitude: marker.geo.latitude,
					longitude: marker.geo.longitude,
					popup: `<h3>${marker.name}</h3>`,
					icon: await HTMLLeafletMarkerElement.getSchemaIcon(marker),
				});
			});
		}

		return await Promise.all(types.map(type => {
			return getJSON(`https://maps.kernvalley.us/places/${type}.json`)
				.then(markers => callback(markers));
		})).then(markers => Promise.all(markers.flat()));

	}

	static get observedAttributes() {
		return [
			'open',
			'hidden',
			'minzoom',
			'maxzoom',
		];
	}
});
