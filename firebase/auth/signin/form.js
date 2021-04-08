import { registerCustomElement, getTemplate, getStylesheet, data, ready,
	getDeferred, on, Events, whenInitialized } from '../../base.js';
/* global firebase: readonly */
registerCustomElement('firebase-auth-signin-form', class HTMLFirebaseAuthSignInFormElement extends HTMLElement {
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });

		Promise.all([
			getTemplate('./firebase/auth/signin/form.html'),
			getStylesheet('./firebase/auth/signin/form.css', { base: shadow }),
			getStylesheet('./css/core-css/forms.css', { base: shadow }),
		]).then(async ([frag]) => {
			const { resolve, reject, promise } = getDeferred();

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
					}
				},
				reset: () => {
					reject(new DOMException('User cancelled sign-in'));
				}
			});

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
