import { marker, icon } from 'https://unpkg.com/leaflet@1.6.0/dist/leaflet-src.esm.js';

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
		const iconEl = document.createElement('slot');

		popup.name = 'popup';
		iconEl.name = 'icon';
		this.slot      = 'markers';

		this.shadowRoot.append(popup, iconEl);

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

	get iconImg() {
		const slot = this.shadowRoot.querySelector('slot[name="icon"]');
		const nodes = slot.assignedNodes();
		return nodes.length === 1 ? nodes[0] : null;
	}

	set iconImg(val) {
		const current = this.iconImg;
		if (current instanceof HTMLImageElement) {
			current.remove();
		}

		if (typeof val === 'string' && val !== '') {
			const img = document.createElememnt('img');
			img.src = val;
			img.slot = 'icon';
			this.append(img);
		} else if (val instanceof HTMLImageElement) {
			val.slot = 'icon';
			this.append(val);
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
		const {latitude, longitude, title, iconImg, popup} = this;
		let m;

		if (iconImg instanceof HTMLImageElement) {
			m = marker([latitude, longitude], {title, icon: icon({
				iconUrl: iconImg.src,
				iconSize: [iconImg.height || 32, iconImg.width || 32],
			})});
		} else {
			m = marker([latitude, longitude], {title});
		}

		if (popup instanceof HTMLElement) {
			m.bindPopup(popup);
		}

		return m;
	}

	static get tagName() {
		return 'map-marker';
	}
}
