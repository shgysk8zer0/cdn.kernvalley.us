customElements.define('network-offline', class HTMLNetworkOfflineElement extends HTMLElement {
	constructor() {
		super();
		this.hidden = navigator.onLine;
		window.addEventListener('online', () => this.hidden = true);
		window.addEventListener('offline', () => this.hidden = false);
	}
});
