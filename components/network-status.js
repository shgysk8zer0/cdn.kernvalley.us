import { registerCustomElement } from '../js/std-js/functions.js';

registerCustomElement('network-status', class HTMLNetworkStatusElement extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({mode: 'open'});
		const online = document.createElement('slot');
		const offline = document.createElement('slot');
		online.name = 'online';
		offline.name = 'offline';
		this.shadowRoot.append(online, offline);
	}

	connectedCallback() {
		const callback = (online = true) => {
			this.shadowRoot.querySelector('slot[name="online"]').assignedNodes()
				.forEach(el => el.hidden = ! online);

			this.shadowRoot.querySelector('slot[name="offline"]').assignedNodes()
				.forEach(el => el.hidden = online);

			window.addEventListener('online', () => callback(true));
			window.addEventListener('offline', () => callback(false));
		};

		callback(navigator.onLine);
	}
});
