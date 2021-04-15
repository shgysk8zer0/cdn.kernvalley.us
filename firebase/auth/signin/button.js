import { registerCustomElement, create, whenInitialized, Events } from '../../base.js';

registerCustomElement('firebase-auth-signin-button', class HTMLFirebaseAuthSignInButtonElement extends HTMLElement {
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });

		whenInitialized().then(firebase => {
			this.hidden = true;
			this.disabled = true;
			firebase.auth().onAuthStateChanged(user => {
				if (user) {
					this.hidden = true;
					this.disabled = true;
				} else {
					this.hidden = false;
					this.disabled = false;
				}
			});

			const btn = create('button', {
				type: 'button',
				title: 'Sign In',
				part: ['button'],
				styles: {
					all: 'inherit',
				},
				children: [
					create('slot', { name: 'text', text: 'Sign In' }),
					create('slot', { name: 'icon' }),
				],
				events: {
					click: async () => {
						if (! this.disabled) {
							await customElements.whenDefined('firebase-auth-signin-form');

							const close = async ({ target }) => {
								const dialog = target.closest('dialog');
								if (dialog.animate instanceof Function) {
									await dialog.animate([{
										'opacity': '1',
									}, {
										'opacity': '0',
									}], {
										duration: 600,
										easing: 'ease-out',
									}).finished;
								}

								dialog.close();
							};

							const dialog = create('dialog', {
								children: [
									create('firebase-auth-signin-form', {
										events: Object.fromEntries([
											[Events.signin, close],
											['cancel', close],
										])
									})
								],
								styles: {
									'width': '450px',
									'max-width': '95vw',
									'border-radius': '8px',
								},
								events: {
									close: ({ target }) => target.remove(),
								}
							});

							document.body.append(dialog);

							if (dialog.aniamte instanceof Function) {
								dialog.animate([{
									'opacity': '0'
								}, {
									'opacity': '1',
								}], {
									duration: 600,
									easing: 'ease-in',
								});
							}

							dialog.showModal();
						}
					},
				}
			});

			requestAnimationFrame(() => {
				shadow.append(btn);
				this.dispatchEvent(new Event(Events.ready));
			});
		});
	}

	get disabled() {
		return this.hasAttribute('disabled');
	}

	set disabled(val) {
		this.toggleAttribute('disabled', val);
	}
});
