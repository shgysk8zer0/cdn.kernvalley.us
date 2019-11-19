import { marker, icon, Icon } from 'https://unpkg.com/leaflet@1.6.0/dist/leaflet-src.esm.js';

export default class HTMLMapMarkerElement extends HTMLElement {
	constructor({
		latitude  = NaN,
		longitude = NaN,
		icon      = null,
		title     = null,
	} = {}) {
		super();
		this.attachShadow({mode: 'open'});
		const popup = document.createElement('slot');
		popup.name = 'popup';
		this.shadowRoot.append(popup);
		this.slot      = 'markers';

		if (! Number.isNaN(longitude)) {
			this.longitude = longitude;
		}

		if (! Number.isNaN(latitude)) {
			this.latitude = latitude;
		}

		if (typeof title === 'string') {
			this.title = title;
		}

		if (typeof icon === 'string') {
			this.icon = icon;
		}
	}

	toJSON() {
		const {latitide, longitude, title} = this;
		return {latitide, longitude, title};
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

	get title() {
		return this.getAttribute('title');
	}

	set title(val) {
		if (typeof val === 'string' && val !== '') {
			this.setAttribute('title', val);
		} else {
			this.removeAttribute('title');
		}
	}

	get icon() {
		if (this.hasAttribute('icon')) {
			return icon({
				iconUrl: new URL(this.getAttribute('icon'), document.baseURI).href,
			});
		} else {
			return Icon.Default;
		}
	}

	set icon(val) {
		if (typeof val === 'string' && val !== '') {
			this.setAttribute('icon', val);
		} else {
			this.removeAttribute('icon');
		}
	}

	get popup() {
		const slot = this.shadowRoot.querySelector('slot[name="popup"]');
		const nodes = slot.assignedNodes();
		return nodes.length === 1 ? nodes[0] : null;
	}

	set popup(el) {
		if (el instanceof HTMLElement) {
			el.slot = 'popup';
			const current = this.popup;
			if (current instanceof HTMLElement) {
				current.remove();
			}
			this.append(el);
		}
	}

	make() {
		const {latitude, longitude, title, icon, popup} = this;
		const m = marker([latitude, longitude], {title, icon});
		if (popup instanceof HTMLElement) {
			m.bindPopup(popup);
		}

		return m;
	}

	static get tagName() {
		return 'map-marker';
	}
}
