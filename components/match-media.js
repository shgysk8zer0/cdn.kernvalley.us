if (('customElements' in self) && customElements.get('match-media') === undefined) {
	customElements.define('match-media', class HTMLMatchMediaElement extends HTMLElement {
		constructor(media = null) {
			super();
			const shadow = this.attachShadow({mode: 'closed'});
			const match  = document.createElement('slot');
			const miss   = document.createElement('slot');

			match.hidden = true;
			miss.hidden  = true;
			match.name   = 'match';
			miss.name    = 'miss';

			if (typeof media === 'string') {
				this.media = media;
			}

			shadow.append(match, miss);

			this.addEventListener('matchmediachange', ({detail}) => {
				if (detail.matches) {
					this.dispatchEvent(new Event('match'));
				} else {
					this.dispatchEvent(new Event('miss'));
				}

				requestAnimationFrame(() => {
					match.hidden = ! detail.matches;
					miss.hidden = detail.matches;
				});
			});
		}

		get media() {
			return this.getAttribute('media');
		}

		set media(val) {
			if (typeof val === 'string') {
				this.setAttribute('media', val);
			} else {
				this.removeAttribute('media');
			}
		}

		get mediaChanged() {
			return new Promise(resolve => {
				this.addEventListener('mediachange', ({detail}) => resolve(detail), {once: true});
			});
		}

		get mediaMatchChanged() {
			return new Promise(resolve => {
				this.addEventListener('matchmediachange', ({detail}) => resolve(detail), {once: true});
			});
		}

		get matched() {
			return new Promise(resolve => this.addEventListener('match', () => resolve(), {once: true}));
		}

		get missed() {
			return new Promise(resolve => this.addEventListener('miss', () => resolve(), {once: true}));
		}

		attributeChangedCallback(name, oldValue, newValue) {
			switch(name) {
			case 'media':
				this.dispatchEvent(new CustomEvent('mediachange', {detail: {oldValue, newValue}}));

				if (newValue !== null) {
					const media = matchMedia(newValue);
					const callback = () => this.dispatchEvent(new CustomEvent('matchmediachange', {detail: media}));
					callback(media);
					media.addListener(callback);
					this.mediaChanged.then(() => media.removeListener(callback));
				}
				break;

			default: throw new Error(`Unhandled attribute changed: ${name}`);
			}
		}

		static get observedAttributes() {
			return [
				'media',
			];
		}
	});
}
