/* global google */
import { importLink } from '../../js/std-js/functions.js';
import { registerCustomElement } from '../../js/std-js/custom-elements.js';
// @see https://developers.google.com/maps/documentation/javascript/tutorial

export default class GoogleMapElement extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({mode: 'open'});
	}

	async connectedCallback() {
		let tmp = await importLink('google-map-template');
		tmp = tmp.cloneNode(true);
		this.shadowRoot.append(...tmp.head.children, ...tmp.body.children);
		const script = document.createElement('script');
		const src = new URL('https://maps.googleapis.com/maps/api/js');
		const {key, libraries} = this;
		script.referrerPolicy = 'origin';
		script.async = true;
		script.defer = true;
		if (this.map === null) {
			const map = document.createElement('div');
			map.slot = 'map';
			this.append(map);
		}
		src.searchParams.set('key', key);
		if (libraries.length !== 0) {
			src.searchParams.set('libraries', libraries.join(','));
		}
		await new Promise((resolve, reject) => {
			script.src = src;
			script.addEventListener('load', () => resolve(), {once: true});
			script.addEventListener('error', err => reject(err), {once: true});
			this.shadowRoot.append(script);

		});
		if (! this.hasAttribute('longitude') || ! this.hasAttribute('latitude')) {
			await this.centerOnUserPos().catch(console.error);
		}
		this.gMap = new google.maps.Map(this.map, {
			center: this.coords,
			zoom: this.zoom,
		});
		this.dispatchEvent(new Event('ready'));
		console.log(this);
	}

	get key() {
		return this.getAttribute('key');
	}

	get libraries() {
		if (this.hasAttribute('libraries')) {
			return this.getAttribute('libraries').split(',').map(library => library.trim());
		} else {
			return [];
		}
	}

	set libraries(libraries) {
		if (! Array.isArray(libraries)) {
			throw new Error('Libraries must be an array');
		} else {
			this.setAttribute('libraries', libraries.join(','));
		}
	}

	set key(key) {
		this.setAttribute('key', key);
	}

	get latitude() {
		return parseFloat(this.getAttribute('latitude'));
	}

	set latitude(latitude) {
		this.setAttribute('latitude', latitude);
	}

	get longitude() {
		return parseFloat(this.getAttribute('longitude'));
	}

	set longitude(longitude) {
		this.setAttribute('longitude', longitude);
	}

	get coords() {
		const {longitude, latitude} = this;
		return {lng: longitude, lat: latitude};
	}

	get zoom() {
		return parseInt(this.getAttribute('zoom')) || 1;
	}

	set zoom(zoom) {
		this.setAttribute('zoom', zoom);
	}

	get map() {
		if (this.shadowRoot.childElementCount === 0) {
			return null;
		} else {
			const slot = this.shadowRoot.querySelector('slot[name="map"]');
			const nodes = slot.assignedNodes();
			return nodes.length === 1 ? nodes[0] : null;
		}
	}

	async ready() {
		await new Promise(resolve => {
			if (this.map === null) {
				this.addEventListener('ready', () => resolve(), {once: true});
			}
		});
	}

	async getLocation({
		maximumAge         = 60000,
		timeout            = 500,
		enableHighAccuracy = false,
	} = {}) {
		return await new Promise((resolve, reject) => {
			if (! ('geolocation' in navigator)) {
				reject(new Error('Geolocation not supported'));
			} else {
				navigator.geolocation.getCurrentPosition(resolve, reject, {maximumAge, timeout, enableHighAccuracy});
			}
		});
	}

	async centerOnUserPos() {
		const {coords} = await this.getLocation();
		const {latitude, longitude} = coords;
		this.latitude = latitude;
		this.longitude = longitude;
	}

	async attributeChangedCallback(name, oldValue, newValue) {
		if (this.isConnected) {
			await this.ready();
			switch(name) {
				case 'zoom':
					this.gMap.zoom = parseFloat(newValue);
					break;
				default:
					console.error(`Unhandled attribute change: ${name}`);
			}
		}
	}

	static get observedAttributes() {
		return [
			'longitude',
			'latitude',
			'zoom',
		];
	}
}

registerCustomElement('google-map', GoogleMapElement);
