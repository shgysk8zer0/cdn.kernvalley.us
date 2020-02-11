import webShareApi from '/js/std-js/webShareApi.js';
import { loaded } from '/js/std-js/functions.js';
import {
	facebook,
	twitter,
	googlePlus,
	linkedIn,
	reddit,
	gmail,
	email,
	clipboard,
} from '/js/std-js/share-config.js';

webShareApi(facebook, twitter, googlePlus, linkedIn, reddit, gmail, email, clipboard);

export default class HTMLShareButtonElement extends HTMLButtonElement {
	constructor() {
		super();

		loaded().then(() => this.hidden = !(navigator.share instanceof Function));

		this.addEventListener('click', async event => {
			event.preventDefault();
			event.stopPropagation();

			try {
				const { title, text, url } = this;
				await navigator.share({ title, text, url });
			} catch (err) {
				console.error(err);
			}
		});
	}

	get text() {
		return this.getAttribute('text');
	}

	set text(text) {
		this.setAttribute('text', text);
	}

	get url() {
		return this.hasAttribute('url')
			? new URL(this.getAttribute('url'), document.baseURI).href
			: location.href;
	}

	set url(url) {
		this.setAttribute('url', url);
	}

	get title() {
		return this.hasAttribute('title') ? this.getAttribute('title') : document.title;
	}

	set title(title) {
		this.setAttribute('title', title);
	}
}

customElements.define('share-button', HTMLShareButtonElement, { extends: 'button' });
