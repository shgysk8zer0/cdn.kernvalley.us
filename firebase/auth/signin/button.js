import { registerCustomElement, create, whenInitialized, Events } from '../../base.js';

registerCustomElement('firebase-auth-signin-button', class HTMLFirebaseAuthSignInButtonElement extends HTMLElement {
	constructor() {
		super();
		this.hidden = true;
		const shadow = this.attachShadow({ mode: 'closed' });

		whenInitialized().then(firebase => {
			firebase.auth().onAuthStateChanged(user => {
				if (user) {
					this.hidden = true;
				} else {
					this.hidden = false;
				}
			});

			const btn = create('button', {
				type: 'button',
				title: 'Sign In',
				part: ['button'],
				children: [
					create('slot', { name: 'icon' }),
					create('slot', { name: 'text', text: 'Sign In' }),
				],
				events: {
					click: async () => {
						this.disabled = true;
						await customElements.whenDefined('firebase-auth-signin-form');
						const form = create('firebase-auth-signin-form', {
							events: {
								'firebase:signin': ({ target }) => target.parentElement.close(),
							}
						});

						const dialog = create('dialog', {
							children: [form],
							events: {
								close: ({ target }) => target.remove(),
							}
						});

						document.body.append(dialog);
						dialog.showModal();
					},
				}
			});

			requestAnimationFrame(() => {
				shadow.append(btn);
				this.dispatchEvent(new Event(Events.ready));
			});
		});

	}
});
