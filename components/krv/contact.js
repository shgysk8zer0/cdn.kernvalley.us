import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { on } from '../../js/std-js/dom.js';
import { loadStylesheet } from '../../js/std-js/loader.js';
import { getHTML } from '../../js/std-js/http.js';
import { meta } from '../../import.meta.js';
import { getURLResolver, callOnce } from '../../js/std-js/utility.js';
import { send } from '../../js/std-js/slack.js';
import { createPolicy } from '../../js/std-js/trust.js';
import { whenIntersecting } from '../../js/std-js/intersect.js';

const ENDPOINT = 'https://contact.kernvalley.us/api/slack';
const policy = createPolicy('krv-contact#html', { createHTML: input => input });
const resolveURL = getURLResolver({ base: meta.url, path: '/components/krv/' });
const getTemplate = callOnce(() => getHTML(resolveURL('./contact.html'), { policy }));
export const trustPolicies = [policy.name];

const symbols = {
	shadow: Symbol('shadow'),
	internals: Symbol('internals'),
};

registerCustomElement('krv-contact', class HTMLKRVContactElement extends HTMLElement {
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });
		this[symbols.shadow] = shadow;

		if (HTMLElement.prototype.attachInternals instanceof Function) {
			this[symbols.internals] = this.attachInternals();
			this[symbols.internals].states.add('--loading');
		}

		this.addEventListener('error', console.error);

		whenIntersecting(this).then(async () => {
			const [tmp] = await Promise.all([
				getTemplate().then(tmp => tmp.cloneNode(true)),
				loadStylesheet(resolveURL('./contact.css'), { parent: shadow }),
				loadStylesheet('https://cdn.kernvalley.us/css/core-css/forms.css', { parent: shadow }),
			]);

			on(tmp.querySelector('form'), {
				reset: () => this.dispatchEvent(new Event('reset')),
				submit: async event => {
					event.preventDefault();
					const target = event.target;
					const data = new FormData(target);

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
							if (this.hasOwnProperty(symbols.internals)) {
								this[symbols.internals].states.delete('--error');
								this[symbols.internals].states.add('--sent');
							}
							target.reset();
						} else {
							throw new Error(`<${resp.url}> [${resp.status} ${resp.statusText}]`);
						}
					} catch(error) {
						if (this.hasOwnProperty(symbols.internals)) {
							this[symbols.internals].states.delete('--sent');
							this[symbols.internals].states.add('--error');
						}

						this.dispatchEvent(new ErrorEvent('error', {
							error,
							message: 'Error submitting form',
						}));
					}
				}
			});

			shadow.append(tmp);
			this.dispatchEvent(new Event('ready'));

			if (this.hasOwnProperty(symbols.internals)) {
				this[symbols.internals].states.delete('--loading');
				this[symbols.internals].states.add('--ready');
			}
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

	set subject(val) {
		this.ready.then(() => this[symbols.shadow].getElementById('krv-contact-subject').value = val);
	}

	set body(val) {
		this.ready.then(() => this[symbols.shadow].getElementById('krv-contact-body').value = val);
	}

	set url(val) {
		this.ready.then(() => this[symbols.shadow].getElementById('krv-contact-url').value = val);
	}

	/**
	 * Based on https://developer.chrome.com/articles/web-share-target/
	 */
	static fromSearchParams({ title = 'title', text = 'text', url = 'url' } = {}) {
		const contactForm = new HTMLKRVContactElement();
		const params = new URLSearchParams(location.search);
		contactForm.subject = params.get(title);
		contactForm.body = params.get(text);
		contactForm.url = params.get(url);
		return contactForm;
	}
});
