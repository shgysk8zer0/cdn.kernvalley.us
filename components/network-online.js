import { registerCustomElement } from '../js/std-js/functions.js';

registerCustomElement('network-online', class HTMLNetworkOfflineElement extends HTMLElement {
	constructor() {
		super();
		this.hidden = !navigator.onLine;
		window.addEventListener('online', () => this.hidden = false);
		window.addEventListener('offline', () => this.hidden = true);
	}
});
