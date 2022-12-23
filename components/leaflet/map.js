import { meta } from '../../import.meta.js';
import { debounce } from '../../js/std-js/utility.js';
import { get as getLocation } from '../../js/std-js/geo.js';
import { on, off, create, query } from '../../js/std-js/dom.js';
import { loadStylesheet } from '../../js/std-js/loader.js';
import { between } from '../../js/std-js/math.js';
import { getCustomElement } from '../../js/std-js/custom-elements.js';
import { getURLResolver } from '../../js/std-js/utility.js';
import HTMLCustomElement from '../custom-element.js';
import { MARKER_TYPES } from './marker-types.js';
import { TILES } from './tiles.js';
import { createSVG, createPath } from '../../js/std-js/svg.js';
import {
	map as LeafletMap,
	tileLayer as LeafletTileLayer,
	point as Point,
	latLng as LatLng,
} from 'https://unpkg.com/leaflet@1.8.0/dist/leaflet-src.esm.js';

export const stylesheet = {
	href: 'https://unpkg.com/leaflet@1.8.0/dist/leaflet.css',
	integrity: 'sha512-hoalWLoI8r4UszCkZ5kL8vayOGVae1oxXe/2A4AO6J9+580uKHDO3JdHb7NzwwzK5xr/Fs0W40kiNHxM9vyTtQ==',
	crossOrigin: 'anonymous',
	referrerPolicy: 'no-referrer',
	fetchPriority: 'high',
};

const initialTitle = document.title;
const GEO_EXP = /#-?\d{1,3}\.\d+,-?\d{1,3}\.\d+(,\d{1,2})?/;
const resolveURL = getURLResolver({ base: meta.url, path: '/components/leaflet/' });

let data = new WeakMap();

async function locate(map, {
	enableHighAccuracy = true, setView = true,
	watch = false, maxZoom = Infinity, timeout = 10000, maximumAge = 0,
} = {}) {
	return await new Promise((resolve, reject) => {
		function success(event) {
			map.off('locationfound', success);
			map.off('locationerror', error);
			const { latitude, longitude, accuracy, timestamp, target } = event;
			const zoom = target.getZoom();
			resolve({ coords: { latitude, longitude, accuracy }, zoom, timestamp });
		}

		function error(event) {
			map.off('locationfound', success);
			map.off('locationerror', error);
			reject(event.message);
		}


		map.on('locationfound', success);
		map.on('locationerror', error);

		map.locate({ enableHighAccuracy, setView, watch, maxZoom, timeout, maximumAge });
	});
}

function parseURL(url = location.href) {
	const hash = url.substr(url.indexOf('#') + 1);

	if (hash.length !== 0 && hash.includes(',')) {
		const [latitude, longitude, zoom] = hash.split(',', 3).map(parseFloat);
		return { latitude, longitude, zoom };
	} else {
		return { latitude: NaN, longitude: NaN, zoom: NaN };
	}
}

async function markLocation({ latitude, longitude }) {
	if (! (Number.isNaN(latitude) || Number.isNaN(longitude))) {
		const map = document.querySelector('leaflet-map[router]');
		const currentHash = location.hash;

		if (map instanceof HTMLElement) {
			customElements.whenDefined('leaflet-marker').then(() => {
				const Marker = customElements.get('leaflet-marker');
				const marker = new Marker({
					latitude,
					longitude,
					popup: `<h3>Marked Location</h3>${latitude}, ${longitude}`,
					icon: 'https://cdn.kernvalley.us/img/adwaita-icons/actions/mark-location.svg',
				});

				marker.id = `#${latitude},${longitude}`;
				marker.title = 'Marked Location';
				document.title = marker.title;
				map.append(marker);
				map.flyTo(marker, 16);
				marker.addEventListener('close', ({ target }) => {
					target.remove();
					if (typeof currentHash === 'string') {
						location.hash = currentHash;
					}
				});
				marker.open = true;
			});
		}
	}
}

function hashchange({ oldURL, newURL }) {
	if (oldURL.includes('#')) {
		const marker = document.getElementById(oldURL.substr(oldURL.indexOf('#') + 1));

		if (marker instanceof HTMLElement && marker.tagName === 'LEAFLET-MARKER') {
			marker.open = false;
		}
	}

	if (newURL.includes('#')) {
		const hash = newURL.substr(newURL.indexOf('#') + 1);
		const marker = document.getElementById(hash);

		if (marker instanceof HTMLElement && marker.tagName === 'LEAFLET-MARKER' && ! marker.open) {
			marker.ready.then(() => {
				marker.closest('leaflet-map').flyTo(marker, 16);
				marker.hidden = false;
				marker.open = true;

				if (typeof marker.title === 'string') {
					document.title = marker.title;
				}
			});
		}
	}
}

function open() {
	location.hash = `#${this.id}`;

	if (this.title.length !== 0) {
		document.title = this.title;
	}
}

function close() {
	setTimeout(() => {
		if (location.hash.substr(1) === this.id) {
			const url = new URL(location.pathname, location.origin).href;
			document.title = initialTitle;
			history.pushState(history.state, document.title, url);
		}
	}, 50);
}

/**
 * @see https://leafletjs.com/reference-1.7.1.html#map-factory
 */
HTMLCustomElement.register('leaflet-map', class HTMLLeafletMapElement extends HTMLCustomElement {
	constructor({
		longitude       = NaN,
		latitude        = NaN,
		zoom            = NaN,
		minZoom         = NaN,
		maxZoom         = NaN,
		zoomControl     = null,
		crossOrigin     = null,
		detectRetina    = null,
		loading         = null,
		markers         = null,
		router          = null,
		centerOnUser    = null,
		tileSrc         = null,
		watch           = NaN,
		find            = NaN,
		allowLocate     = null,
		allowFullscreen = null,
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

		this.addEventListener('connected', () => {
			if (! Number.isNaN(latitude) && ! Number.isNaN(longitude)) {
				this.center = { latitude, longitude };
			} else if (centerOnUser === true) {
				this.centerOnUser();
			}

			if (allowLocate) {
				this.allowLocate = true;
			}

			if (allowFullscreen) {
				this.allowFullscreen = true;
			}

			if (typeof tileSrc === 'string') {
				this.tileSrc = tileSrc;
			}

			if (! Number.isNaN(zoom)) {
				this.zoom = zoom;
			}

			if (typeof zoomControl === 'boolean') {
				this.zoomControl = zoomControl;
			}

			if (! Number.isNaN(minZoom)) {
				this.minZoom = minZoom;
			}

			if (! Number.isNaN(maxZoom)) {
				this.maxZoom = maxZoom;
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

			if (typeof router === 'boolean') {
				this.router = router;
			}

			if (Number.isSafeInteger(watch)) {
				this.watch = watch;
			} else if (Number.isSafeInteger(find)) {
				this.find = find;
			}

			this.addEventListener('pan', debounce(async ({ detail: { center, zoom }}) => {
				if (this.router && ! (this.openMarker instanceof HTMLElement)) {
					this.center = center;
					this.zoom = zoom;
					const url = new URL(location.href);
					url.hash = `#${center.latitude},${center.longitude},${zoom}`;
					history.replaceState(history.state, document.title, url.href);
				}
			}, 150), { passive: true });

			this.addEventListener('zoom', debounce(({ detail: { zoom }}) => {
				const markers = query('[slot="markers"][minzoom],[slot="markers"][maxzoom]', this);
				markers.forEach(marker => {
					const { minZoom = 0, maxZoom = 100, open } = marker;

					if (! open) {
						if (Number.isNaN(minZoom)) {
							marker.hidden = zoom > maxZoom;
						} else if (Number.isNaN(maxZoom)) {
							marker.hidden = zoom < minZoom;
						} else {
							marker.hidden = ! between(minZoom, zoom, maxZoom);
						}
					}
				});
			}), { passive: true });
		}, { once: true });

		Promise.allSettled([
			this.whenConnected,
			this.whenLoad,
		]).then(async () => {
			const events = {
				slotchange: ({ target }) => {
					const detail = target.assignedElements();
					this.dispatchEvent(new CustomEvent(`${target.name}change`, { detail }));
					switch(target.name) {
						case 'attribution':
							this.ready.then(() => {
								const ac = this.map.attributionControl;
								Object.keys(ac._attributions).forEach(attr => ac.removeAttribution(attr));
								target.assignedElements().forEach(el => {
									const clone = el.cloneNode(true);
									clone.removeAttribute('slot');
									ac.addAttribution(clone.outerHTML);
								});
							});

							break;
					}
				}
			};

			const doc = create('div', {
				part: ['container'],
				children: [
					create('slot', { events, attrs: { name: 'toolbar' }}),
					create('slot', {
						events,
						attrs: { name: 'map' },
						children: [
							create('div', { id: 'map-fallback', part: ['map'] }),
						],
					}),
					create('slot', {
						events,
						name: 'attribution',
						children: [
							create('a', {
								text: 'Wikimedia',
								part: ['attribution'],
								attrs: {
									href: 'https://wikimediafoundation.org/wiki/Maps_Terms_of_Use',
									rel: 'noopener noreferrer external',
								}
							})
						],
					}),
					create('slot', { events, attrs: { name: 'markers' }}),
					create('slot', { events, attrs: { name: 'overlays' }}),
					create('slot', { events, attrs: { name: 'geojson' }}),
				]
			});

			await Promise.allSettled([
				loadStylesheet(stylesheet.href, {
					integrity: stylesheet.integrity,
					crossOrigin: stylesheet.crossOrigin,
					referrerPolicy: stylesheet.referrerPolicy,
					fetchPriority: stylesheet.fetchPriority,
					parent: this._shadow,
				}),
				loadStylesheet(resolveURL('./map.css'), { parent: this._shadow }),
			]);

			requestAnimationFrame(async () => {
				this._shadow.append(doc);
				this.dispatchEvent(new Event('populated'));

				if ('markers' in this.dataset) {
					await this.loadMarkers(...this.dataset.markers.split(' ')).catch(console.error);
				}
			});
		});
	}

	async connectedCallback() {
		const prom = this.whenConnected;
		this.dispatchEvent(new Event('connected'));

		await Promise.all([ this._populated, prom ]);
		const mapEl = this.mapElement;
		const iconSize = 19;
		const m = LeafletMap(mapEl, { zoomControl: false });
		const tl = mapEl.querySelector('.leaflet-top.leaflet-left');
		const bl = mapEl.querySelector('.leaflet-bottom.leaflet-left');
		const br = mapEl.querySelector('.leaflet-bottom.leaflet-right');
		const tr = mapEl.querySelector('.leaflet-top.leaflet-right');

		tl.part.add('top-left');
		bl.part.add('bottom-left');
		br.part.add('bottom-right');
		tr.part.add('top-right');

		tl.append(
			create('slot', { name: 'top-left', classList: ['leaflet-control'] }),
			create('div', {
				classList: ['leaflet-bar', 'leaflet-control'],
				part: ['zoom-controls'],
				children: [
					create('a', {
						href: '#',
						role: 'button',
						title: 'Zoom In',
						part: ['btn', 'zoom-in-btn', 'zoom-btn', 'control-btn'],
						classList: ['leaflet-control-btn', 'background-inherit', 'color-inherit'],
						events: {
							click: event => {
								event.preventDefault();
								this.zoomIn();
							}
						},
						children: [
							createSVG({
								width: iconSize,
								height: iconSize,
								classList: ['icon'],
								viewBox: [0, 0, 16, 16],
								fill: 'currentColor',
								part: ['icon', 'zoom-in-icon'],
								children: [
									createPath(
										'M3.19 2c-.663 0-1.188.549-1.188 1.219v9.562c0 .67.525 1.22 1.188 1.22h9.625c.663 0 1.187-.55 1.187-1.22V3.22c0-.67-.524-1.219-1.187-1.219zm3.812 3h2v2h2v2h-2v2h-2V9h-2V7h2z',
									),
								]
							})
						]
					}),
					create('a', {
						href: '#',
						role: 'button',
						title: 'Zoom Out',
						part: ['btn', 'zoom-out-btn', 'zoom-btn', 'control-btn'],
						classList: ['leaflet-control-btn'],
						events: {
							click: event => {
								event.preventDefault();
								this.zoomOut();
							}
						},
						children: [
							createSVG({
								width: iconSize,
								height: iconSize,
								classList: ['icon'],
								viewBox: [0, 0, 16, 16],
								fill: 'currentColor',
								part: ['icon', 'zoom-out-icon'],
								children: [
									createPath(
										'M3.19 2c-.663 0-1.188.549-1.188 1.219v9.562c0 .67.525 1.22 1.188 1.22h9.625c.663 0 1.187-.55 1.187-1.22V3.22c0-.67-.524-1.219-1.187-1.219zm1.812 5h6v2h-6z',
									),
								]
							})
						]
					}),
				]
			})
		);

		bl.append(
			create('slot', { name: 'bottom-left', classList: ['leaflet-control'] }),
			create('div', {
				classList: ['leaflet-bar', 'leaflet-control'],
				part: ['other-controls'],
				children: [
					create('a', {
						role: 'button',
						href: '#',
						title: 'Toggle fullscreen',
						part: ['btn', 'fullscreen-btn', 'control-btn'],
						classList: ['leaflet-control-btn'],
						events: {
							click: event => {
								event.preventDefault();
								if (this.isSameNode(document.fullscreenElement)) {
									document.exitFullscreen();
								} else {
									this.requestFullscreen();
								}
							}
						},
						children: [
							create('slot', {
								name: 'enter-fullscreen-icon',
								children: [
									createSVG({
										width: iconSize,
										height: iconSize,
										classList: ['icon'],
										viewBox: [0, 0, 14, 16],
										fill: 'currentColor',
										part: ['icon', 'enter-fullscreen-icon'],
										children: [
											createPath(
												'M13 10h1v3c0 .547-.453 1-1 1h-3v-1h3v-3zM1 10H0v3c0 .547.453 1 1 1h3v-1H1v-3zm0-7h3V2H1c-.547 0-1 .453-1 1v3h1V3zm1 1h10v8H2V4zm2 6h6V6H4v4zm6-8v1h3v3h1V3c0-.547-.453-1-1-1h-3z',
												{ 'fill-rule': 'evenodd' },
											),
										]
									})
								]
							}),
							create('slot', {
								name: 'exit-fullscreen-icon',
								children: [
									createSVG({
										width: iconSize,
										height: iconSize,
										classList: ['icon'],
										viewBox: [0, 0, 14, 16],
										fill: 'currentColor',
										part: ['icon', 'exit-fullscreen-icon'],
										children: [
											createPath(
												'M2 4H0V3h2V1h1v2c0 .547-.453 1-1 1zm0 8H0v1h2v2h1v-2c0-.547-.453-1-1-1zm9-2c0 .547-.453 1-1 1H4c-.547 0-1-.453-1-1V6c0-.547.453-1 1-1h6c.547 0 1 .453 1 1v4zM9 7H5v2h4V7zm2 6v2h1v-2h2v-1h-2c-.547 0-1 .453-1 1zm1-10V1h-1v2c0 .547.453 1 1 1h2V3h-2z',
												{ 'fill-rule': 'evenodd' },
											)
										]
									})
								]
							})
						],
					}),
					create('a', {
						role: 'button',
						href: '#',
						title: 'Locate',
						part: ['btn', 'locate-btn', 'control-btn'],
						events: {
							click: async event => {
								event.preventDefault();

								const [{ coords }, LeafletMarker] = await Promise.all([
									getLocation({ enableHighAccuracy: true }),
									getCustomElement('leaflet-marker'),
								]);

								const marker = new LeafletMarker({
									latitude: coords.latitude,
									longitude: coords.longitude,
									popup: '<h3>Current Loction</h3>',
									icon: 'https://cdn.kernvalley.us/img/adwaita-icons/actions/mark-location.svg',
								});

								marker.id = `${coords.latitude},${coords.longitude}`;

								marker.addEventListener('close', ({ target }) => target.remove());
								this.append(marker);
								await this.flyTo(marker, 16);

								if (this.router) {
									document.title = 'Current Location';
								}
								marker.open = true;
							}
						},
						classList: ['leaflet-control-btn'],
						children: [
							create('slot', {
								name: 'locate-btn',
								children: [
									createSVG({
										width: iconSize,
										height: iconSize,
										classList: ['icon'],
										viewBox: [0, 0, 16, 16],
										fill: 'currentColor',
										part: ['icon','locate-icon'],
										children: [
											createPath('M7 0v1.031A6.514 6.514 0 0 0 1.062 7H0v1h1.063A6.514 6.514 0 0 0 7 13.969V15h1v-1.031c3.188-.234 5.724-2.78 5.969-5.969H15V7h-1.031C13.724 3.811 11.189 1.233 8 1V0zm.531 2.813c2.607 0 4.688 2.08 4.688 4.687s-2.081 4.688-4.688 4.688c-2.606 0-4.75-2.082-4.75-4.688s2.144-4.688 4.75-4.688zM7.5 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z'),
										]
									})
								],
							}),
						],
					}),
				],
			}),
		);

		br.append(
			create('slot', { name: 'bottom-right', classList: ['leaflet-control'] }),
		);

		tr.append(
			create('slot', { name: 'top-right', classList: ['leaflet-control'] }),
		);

		console.log({ tl, bl, br, tr });

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

		m.on({ move: handler, zoom: handler });

		const { latitude, longitude } = this.center;

		if (! Number.isNaN(latitude) && ! Number.isNaN(longitude)) {
			m.setView([latitude, longitude], this.zoom);
		} else if (this.router === true && location.hash.length > 5 && GEO_EXP.test(location.hash)) {
			const { latitude, longitude, zoom } = parseURL(location.href);

			if (! (Number.isNaN(latitude) || Number.isNaN(longitude))) {
				m.setView([latitude, longitude], zoom || this.zoom);
			} else {
				// It's Disneyland
				m.setView([33.811137945997444, -117.91675329208375], this.zoom);
			}
		} else if (await this.hasGeoPermission()) {
			const { latitude, longitude } = await this.coords;
			m.setView([latitude, longitude], this.zoom);
		} else {
			// It's Disneyland
			m.setView([33.811137945997444, -117.91675329208375], this.zoom);
		}

		const tiles = LeafletTileLayer(this.tileSrc, {
			attribution: this.attribution,
			crossOrigin: this.crossOrigin,
			detectRetina: this.detectRetina,
			minZoom: this.minZoom,
			maxZoom: this.maxZoom,
			label: 'OpenStreetMap',
		}).addTo(m);

		data.set(this, { map: m, tiles });

		this.dispatchEvent(new Event('ready'));
	}

	disconnectedCallback() {
		data.delete(this);
	}

	get ready() {
		return new Promise(async resolve => {
			await this._populated;
			if (! data.has(this)) {
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
		if (this._shadow.childElementCount === 0) {
			return new Promise(r =>on(this, 'populated', () => r(this), { once: true }));
		} else {
			return Promise.resolve(this);
		}
	}

	get allowFullscreen() {
		return this.hasAttribute('allowfullscreen');
	}

	set allowFullscreen(val) {
		this.toggleAttribute('allowfullscreen', val);
	}

	get allowLocate() {
		return this.hasAttribute('allowlocate');
	}

	set allowLocate(val) {
		this.toggleAttribute('allowlocate', val);
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
		return parseInt(this.getAttribute('minzoom')) || 7;
	}

	set minZoom(val) {
		if (Number.isSafeInteger(val)) {
			this.setAttribute('minzoom', val);
		} else {
			this.removeAttribute('minzoom');
		}
	}

	get maxZoom() {
		return parseInt(this.getAttribute('maxzoom')) || 19;
	}

	set maxZoom(val) {
		if (Number.isSafeInteger(val)) {
			this.setAttribute('maxzoom', val);
		} else {
			this.removeAttribute('maxzoom');
		}
	}

	get bounds() {
		if (data.has(this)) {
			return data.get(this).map.getBounds();
		} else {
			return null;
		}
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

	set center({ latitude, longitude }) {
		if (typeof latitude === 'number' && typeof longitude === 'number') {
			this.setAttribute('center', `${latitude},${longitude}`);
		} else {
			throw new Error('{latitude, longitude} must be numbers');
		}
	}

	get centerLatLng() {
		return HTMLLeafletMapElement.latLng(this.center);
	}

	get zoomControl() {
		return this.hasAttribute('zoomcontrol');
	}

	set zoomControl(val) {
		this.toggleAttribute('zoomcontrol', val);
	}

	get tileSrc() {
		return this.getAttribute('tilesrc') || TILES.wikimedia.tileSrc;
	}

	set tileSrc(val) {
		if (typeof val === 'string') {
			this.setAttribute('tilesrc', val);
		} else {
			this.removeAttribute('tilesrc');
		}
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

	set attribution(val) {
		if (typeof val === 'string') {
			const el = document.createElement('span');
			el.textContent = val;
			this.attribution = el;
		} else if (val instanceof HTMLElement) {
			val.slot = 'attribution';
			const slotted = this.querySelectorAll('[slot="attribution"]');

			if (slotted.length === 0) {
				this.append(val);
			} else if (slotted.length === 1) {
				slotted.item(0).replaceWith(val);
			} else {
				slotted.forEach(el => el.remove());
				this.append(val);
			}
		} else {
			this.querySelectorAll('[slot="attribution"]').forEach(el => el.remove());
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

	get openMarker() {
		return this.querySelector('leaflet-marker[open]');
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

			this.flyTo({ latitude, longitude }, zoom || this.zoom);
		}
	}

	async flyTo({ latitude = NaN, longitude = NaN }, zoom) {
		await this.ready;
		if (! (typeof latitude === 'number' && typeof longitude === 'number')
			|| Number.isNaN(latitude) || Number.isNaN(longitude)) {
			throw new TypeError('Latitude and longitude must be floats');
		} else if (Number.isSafeInteger(zoom)) {
			this.map.flyTo([latitude, longitude], zoom);
		} else {
			this.map.flyTo([latitude, longitude]);
		}
	}

	async hasGeoPermission(values = ['granted']) {
		if ('permissions' in navigator && navigator.permissions.query instanceof Function) {
			const { state } = await navigator.permissions.query({ name: 'geolocation' });
			return values.includes(state);
		} else {
			return ('geolocation' in navigator);
		}
	}

	async markUserLocation({
		icon = 'https://cdn.kernvalley.us/img/adwaita-icons/actions/mark-location.svg',
		body = 'This site would like permission to use your location to mark where you are on the map',
		popup = '<h3>Current Location</h3>',
	} = {}) {
		const Marker = await getCustomElement('leaflet-marker');

		if (await this.hasGeoPermission()) {
			const { latitude, longitude } = await this.coords;
			const marker = new Marker({ latitude, longitude, icon, popup });
			marker.addEventListener('close', ({ target }) => setTimeout(() => target.remove(), 400));
			this.append(marker);
			marker.open = true;
		} else {
			const Notification = await getCustomElement('html-notification');
			const notification = new Notification('Allow location access?', {
				body,
				icon: 'https://cdn.kernvalley.us/img/adwaita-icons/actions/find-location.svg',
				pattern: [300, 0, 300],
				requireInteraction: true,
				actions: [{
					title: 'Grant',
					action: 'grant',
					icon: 'https://cdn.kernvalley.us/img/octicons/check.svg',
				}, {
					title: 'Deny',
					action: 'deny',
					icon: 'https://cdn.kernvalley.us/img/octicons/x.svg',
				}]
			});

			notification.addEventListener('notificationclick', ({ target, action }) => {
				switch(action) {
					case 'grant':
						this.coords.then(({ latitude, longitude }) => {
							const marker = new Marker({ latitude, longitude, icon, popup });
							marker.addEventListener('close', ({ target }) => setTimeout(() => target.remove(), 400));
							this.append(marker);
							marker.open = true;
						});
						target.close();
						break;

					case 'deny':
						target.close();
						break;
				}
			});
		}
	}

	async locate({ enableHighAccuracy= true, setView = true, watch = false,
		maxZoom = Infinity, timeout = 10000, maximumAge = 0 } = {}) {
		await this.ready;
		return await locate(this.map, { enableHighAccuracy, setView, watch, maxZoom, timeout, maximumAge });
	}

	async stopLocate() {
		await this.ready;
		this.map.stopLocate();
	}

	async centerOnUser(zoom = 16) {
		this.flyTo(await this.coords, zoom);
	}

	containsLatLng(latLng) {
		const bounds = this.bounds;
		return typeof bounds === 'object' ? bounds.contains(latLng) : false;
	}

	contains({ latitude, longitude, altitude }) {
		return this.containsLatLng(HTMLLeafletMapElement.latLng({ latitude, longitude, altitude }));
	}

	containsMarker(marker) {
		return marker instanceof HTMLElement && this.containsLatLng(marker.latLng);
	}

	containsMarkers(...markers) {
		if (data.has(this)) {
			const bounds = this.bounds;
			return markers.filter(({ latLng }) => bounds.contains(latLng));
		}
	}

	get map() {
		if (data.has(this)) {
			return data.get(this).map;
		} else {
			return null;
		}
	}

	get find() {
		return parseInt(this.hasAttribute('find')) || this.maxZoom;
	}

	/**
	 * Value will be `maxZoom` on call to `locate()`
	 */
	set find(val) {
		if (Number.isSafeInteger(val)) {
			this.setAttribute('find', val);
		} else {
			this.removeAttribute('find');
		}
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

	get markersReady() {
		return Promise.allSettled(this.markers.map(marker => marker.ready));
	}

	get visibleMarkers() {
		return this.containsMarkers(...this.markers);
	}

	get geoJson() {
		if (this._shadow.childElementCount === 0) {
			return [];
		} else {
			const slot = this._shadow.querySelector('slot[name="geojson"]');
			return slot.assignedNodes();
		}
	}

	get router() {
		return this.hasAttribute('router');
	}

	set router(val) {
		this.toggleAttribute('router');
	}

	get token() {
		return this.getAttribute('token');
	}

	set token(val) {
		this.setAttribute('token', val);
	}

	get watch() {
		return parseInt(this.hasAttribute('watch')) || this.maxZoom;
	}

	/**
	 * Value will be `maxZoom` on call to `locate()`
	 */
	set watch(val) {
		if (Number.isSafeInteger(val)) {
			this.setAttribute('watch', val);
		} else {
			this.removeAttribute('watch');
		}
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
		const Marker = getCustomElement('leaflet-marker');
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

	async loadMarkers(...types) {
		await customElements.whenDefined('leaflet-marker');
		const Marker = customElements.get('leaflet-marker');
		const markers = await Marker.getMarkers(...types);
		this.append(...markers);
	}

	async setTileServer({ tileSrc, minZoom, maxZoom, attribution, detectRetina, crossOrigin, label }) {
		await this.ready;

		const { tiles } = data.get(this);

		if (tiles) {
			tiles.remove();
		}

		const newTiles = LeafletTileLayer(tileSrc, { minZoom, maxZoom, attribution,
			detectRetina, crossOrigin, label }).addTo(this.map);

		data.set(this, { map: this.map, tiles: newTiles });
	}

	async attributeChangedCallback(name, oldVal, newVal) {
		switch (name) {
			case 'zoom':
				this.ready.then(() => this.map.setZoom(this.zoom));
				break;

			case 'center':
				this.ready.then(() => {
					const { lat, lng } = this.map.getCenter();
					const [latitude, longitude] = newVal.split(',', 2).map(parseFloat);
					if (! (Number.isNaN(latitude) || Number.isNaN(longitude))
						&& lat !== latitude && lng !== longitude) {
						this.flyTo({ latitude, longitude });
					}
				});
				break;

			case 'loading':
				this.lazyLoad(newVal === 'lazy');
				break;

			case 'minzoom':
				if (typeof newVal === 'string') {
					this.ready.then(() => data.get(this).map.setMinZoom(parseInt(newVal)));
				}
				break;

			case 'maxzoom':
				if (typeof newVal === 'string') {
					this.ready.then(() => data.get(this).map.setMaxZoom(parseInt(newVal)));
				}
				break;

			case 'router':
				await Promise.all([
					this.whenConnected,
					this.ready,
					this._populated,
				]);

				if (typeof newVal === 'string') {
					addEventListener('hashchange', hashchange);
					on(this.markers, { open, close });

					if (location.hash.length > 1) {
						const target = document.getElementById(location.hash.substr(1));

						if (target instanceof HTMLElement && target.tagName === 'LEAFLET-MARKER') {
							await customElements.whenDefined('leaflet-marker');
							await target.ready;
							target.hidden = false;
							this.flyTo(target, 16);
							target.open = true;

							if (typeof target.title === 'string') {
								document.title = target.title;
							}
						} else if (location.hash.includes(',')) {
							const [latitude = NaN, longitude = NaN] = location.hash.substr(1)
								.split(',', 2).map(parseFloat);
							markLocation({ latitude, longitude });
						}
					}

				} else {
					removeEventListener('hashchange', hashchange);
					off(this.markers, { open, close });
				}
				break;

			case 'tilesrc':
				this.ready.then(async () => {
					if (typeof newVal === 'string') {
						const { tiles } = data.get(this);
						tiles.setUrl(newVal);
					}
				});
				break;

			case 'watch':
				if (typeof newVal === 'string') {
					if (await this.hasGeoPermission(['granted', 'prompt'])) {
						const maxZoom = Math.min(parseInt(newVal) || 20, this.maxZoom);
						this.locate({
							setView: true,
							watch: true,
							enableHighAccuracy: true,
							maxZoom,
						});
					} else {
						this.watch = null;
					}
				} else {
					this.stopLocate();
				}
				break;

			case 'find':
				if (typeof newVal === 'string') {
					if (await this.hasGeoPermission(['granted', 'prompt'])) {
						const maxZoom = Math.min(parseInt(newVal) || 20, this.maxZoom);

						try {
							await this.locate({
								setView: true,
								enableHighAccuracy: true,
								maxZoom,
							});
						} catch(err) {
							console.error(err);
						} finally {
							this.find = null;
						}
					} else {
						this.find = null;
					}
				}
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
			'minzoom',
			'maxzoom',
			'router',
			'center',
			'tilesrc',
			'watch',
			'find',
		];
	}

	static parseURL(url = location.href) {
		if (HTMLLeafletMapElement.urlHasGeo(url)) {
			return parseURL(url);
		}
	}

	static get wikimedia() {
		return TILES.wikimedia.tileSrc;
	}

	static get osm() {
		return TILES.osm.tileSrc;
	}

	static get natGeo() {
		return TILES.natGeo.tileSrc;
	}

	static get allMarkerTypes() {
		return MARKER_TYPES;
	}

	static get tileServers() {
		return TILES;
	}

	static urlHasGeo(url = location.href) {
		return url.includes('#') && GEO_EXP.test(url);
	}

	static point({ latitude, longitude }) {
		return new Point({ x: latitude, y: longitude });
	}

	static latLng({ latitude, longitude, altitude }) {
		return new LatLng({ lat: latitude, lng: longitude, alt: altitude });
	}
});
