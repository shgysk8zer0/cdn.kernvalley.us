import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { on } from '../../js/std-js/dom.js';
import { loadStylesheet } from '../../js/std-js/loader.js';
import { getHTML } from '../../js/std-js/http.js';
import { meta } from '../../import.meta.js';
import { send } from '../../js/std-js/slack.js';
const ENDPOINT = 'https://contact.kernvalley.us/api/slack';

const symbols = {
	shadow: Symbol('shadow'),
};

registerCustomElement('krv-contact', class HTMLKRVContactElement extends HTMLElement {
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });
		this[symbols.shadow] = shadow;
		this.addEventListener('error', console.error);

		Promise.all([
			getHTML(new URL('./components/krv/contact.html', meta.url).href),
			loadStylesheet(new URL('./components/krv/contact.css', meta.url).href, { parent: shadow }),
			loadStylesheet('https://cdn.kernvalley.us/css/core-css/forms.css', { parent: shadow }),
		]).then(async ([tmp]) => {
			on(tmp.querySelector('form'), {
				reset: () => this.dispatchEvent(new Event('reset')),
				submit: async event => {
					event.preventDefault();
					const data = new FormData(event.target);

					try {
						const resp = await send(ENDPOINT, {
							name: data.get('name'),
							email: data.get('email'),
							phone: data.get('phone'),
							url: data.get('url'),
							subject: data.get('subject'),
							body: data.get('body'),
						});

						if (resp.success) {
							this.dispatchEvent(new Event('sent'));
							event.target.reset();
						} else {
							throw new Error(`<${resp.url}> [${resp.status} ${resp.statusText}]`);
						}
					} catch(error) {
						this.dispatchEvent(new ErrorEvent('error', {
							error,
							message: 'Error submitting form',
						}));
					}
				}
			});

			shadow.append(tmp);
			this.dispatchEvent(new Event('ready'));
		});
	}

	connectedCallback() {
		this.dispatchEvent(new Event('connected'));
	}

	get ready() {
		if (this[symbols.shadow].childElementCount > 2) {
			return Promise.resolve();
		} else {
			return new Promise(resolve => this.addEventListener('ready', () => resolve(), { once: true }));
		}
	}

	get whenConnected() {
		if (this.isConnected) {
			return Promise.resolve();
		} else {
			return new Promise(resolve => this.addEventListener('connected', () => resolve(), { once: true}));
		}
	}
});