import { registerCustomElement, create, whenInitialized, Events } from '../../base.js';
import { confirm } from '../../../js/std-js/asyncDialog.js';

registerCustomElement('firebase-auth-signout-button', class HTMLFirebaseAuthSignOutButtonElement extends HTMLElement {
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: 'closed' });

		whenInitialized().then(firebase => {
			this.hidden = true;
			this.disabled = true;
			this.tabIndex = 0;
			firebase.auth().onAuthStateChanged(user => {
				if (user) {
					this.hidden = false;
					this.disabled = false;
				} else {
					this.hidden = true;
					this.disabled = true;
				}
			});

			const btn = create('button', {
				type: 'button',
				part: ['button'],
				title: 'Sign Out',
				styles: { all: 'inherit' },
				children: [
					create('slot', { name: 'text', text: 'Sign Out' }),
					create('slot', { name: 'icon' }),
				],
				events: {
					click: async () => {
						if (! this.disabled) {
							if (await confirm('Are you sure you wish to sign out?')) {
								await firebase.auth().signOut();
								this.dispatchEvent(new Event(Events.signout));
							}
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
