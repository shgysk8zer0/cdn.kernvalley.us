import { registerCustomElement, create, whenInitialized, Events } from '../../base.js';
import { confirm } from '../../../js/std-js/asyncDialog.js';

registerCustomElement('firebase-auth-signout-button', class HTMLFirebaseAuthSignOutButtonElement extends HTMLElement {
	constructor() {
		super();
		this.hidden = true;
		const shadow = this.attachShadow({ mode: 'closed' });

		whenInitialized().then(firebase => {
			firebase.auth().onAuthStateChanged(user => {
				if (user) {
					this.hidden = false;
				} else {
					this.hidden = true;
				}
			});

			const btn = create('button', {
				type: 'button',
				part: ['button'],
				title: 'Sign Out',
				children: [
					create('slot', { name: 'icon' }),
					create('slot', { name: 'text', text: 'Sign Out' }),
				],
				events: {
					click: async () => {
						if (await confirm('Are you sure you wish to sign out?')) {
							await firebase.auth().signOut();
							this.dispatchEvent(new Event(Events.signout));
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
});
