if (('customElements' in self) && customElements.get('match-media') === undefined) {
	customElements.define('match-media', class HTMLMatchMediaElement extends HTMLElement {
		constructor() {
			super();
			this.attachShadow({mode: 'open'});
			const match = document.createElement('slot');
			const miss = document.createElement('slot');
			match.name = 'match';
			miss.name = 'miss';
			this.shadowRoot.append(match, miss);
		}

		connectedCallback() {
			const media = matchMedia(this.media);
			const callback = ({matches}) => {
				requestAnimationFrame(() => {
					this.shadowRoot.querySelector('slot[name="match"]').assignedNodes()
						.forEach(el => el.hidden = ! matches);
					this.shadowRoot.querySelector('slot[name="miss"]').assignedNodes()
						.forEach(el => el.hidden = matches);
				});
			};

			callback(media);
			media.addListener(callback);
		}

		get media() {
			return this.getAttribute('media') || 'all';
		}

		set media(val) {
			this.setAttribute('media', val);
		}
	});
}
