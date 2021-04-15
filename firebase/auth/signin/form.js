import { registerCustomElement, getTemplate, getStylesheet, data, ready,
	getDeferred, on, Events, whenInitialized, extend, loadImage, getBaseStyleshseet } from '../../base.js';
import { md5 } from '../../../js/std-js/hash.js';
import { EventPublisher } from '../../../js/std-js/EventPublisher.js';

async function getGravatar(email, {
	size = 192,
} = {}) {
	const url = new URL(await md5(email), 'https://secure.gravatar.com/avatar/');
	url.searchParams.set('s', size);
	url.searchParams.set('d', 'mm');
	const img = await loadImage(url.href, { height :size, width: size, slot: 'gravatar', loading: 'lazy' });

	return img;
}

/* global firebase: readonly */
registerCustomElement('firebase-auth-signin-form', class HTMLFirebaseAuthSignInFormElement extends extend(HTMLElement, EventPublisher) {
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });
		this.publishEvents(Events.signin, 'cancel');

		Promise.all([
			getTemplate('./firebase/auth/signin/form.html'),
			getBaseStyleshseet(shadow),
			getStylesheet('./firebase/auth/signin/form.css', { parent: shadow }),
			getStylesheet('./css/core-css/forms.css', { parent: shadow }),
		]).then(async ([frag]) => {
			const { resolve, reject, promise } = getDeferred();
			const controller = new AbortController();
			const signal = controller.signal;

			on(frag.querySelector('[name="email"]'), {
				input: async ({ target: { form, value: email, validity: { valid }}}) => {
					if (valid) {
						const slot = form.querySelector('slot[name="gravatar"]');
						const assigned = slot.assignedElements();
						const img = await getGravatar(email);
						assigned.forEach(el => el.remove());
						console.log({ assigned });
						this.append(img);
					} else {
						this.querySelectorAll('[slot="gravatar"]').forEach(el => el.remove());
					}
				}
			});

			on(frag.querySelector('form'), {
				submit: async event => {
					event.preventDefault();
					const target = event.target;
					const data = new FormData(target);
					const user = await firebase.auth()
						.signInWithEmailAndPassword(data.get('email'), data.get('password'));
					console.log({ user });

					if (user) {
						this.dispatchEvent(new Event(Events.signin));
						resolve(user);
						controller.abort();
					}
				},
				reset: () => {
					this.dispatchEvent(new Event('cancel'));
					reject(new DOMException('User cancelled sign-in'));
					controller.abort();
				}
			}, { signal });

			await whenInitialized();
			shadow.append(frag);
			data.set(this, { shadow, promise });
			this.dispatchEvent(new Event(Events.ready));
		});
	}

	get ready() {
		return ready(this);
	}

	get promise() {
		return data.get(this, 'promise');
	}
});
