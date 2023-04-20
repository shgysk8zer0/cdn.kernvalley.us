import { getString, setString, getBool, setBool, getURL, setURL } from '../../js/std-js/attrs.js';

const protectedData = new WeakMap();

async function shareHandler(event) {
	if (event.type === 'click' || (event.type === 'keydown' && event.keyCode === 13)) {
		const { shareTitle: title, text, url } = this;
		const { internals } = protectedData.get(this);
		internals.ariaPressed = 'true';

		try {
			await navigator.share({ title, text, url });
		} finally {
			internals.ariaPressed = 'false';
		}
	}
}

customElements.define('share-button', class HTMLShareButtonElement extends HTMLElement {
	constructor() {
		super();
		const internals = this.attachInternals();
		protectedData.set(this, { internals });
		requestIdleCallback(() => {
			internals.role = 'button';
			internals.ariaLabel = 'Share';
			this.style.setProperty('appearance', 'button');
			if (true || navigator.share instanceof Function) {
				this.tabIndex = 0;
				this.addEventListener('click', shareHandler);
				this.addEventListener('keydown', shareHandler);
			} else {
				this.disabled = true;
				// this.hidden = true;
			}
		});
	}

	attributeChangedCallback(name, oldVal, newVal) {
		const { internals } = protectedData.get(this);

		switch(name) {
			case 'disabled':
				if (typeof newVal === 'string') {
					internals.ariaDisabled = 'true';
					internals.states.add('--disabled');
				} else {
					internals.ariaDisabled = 'false';
					internals.states.delete('--disabled');
				}
				break;
		}
	}

	get disabled() {
		return getBool(this, 'disabled');
	}

	set disabled(val) {
		setBool(this, 'disabled', val);
	}

	get shareTitle() {
		return getString(this, 'sharetitile', { fallback: document.title });
	}

	set shareTitle(val) {
		setString(this, 'sharetitle', val);
	}

	get text() {
		return getString(this, 'text');
	}

	set text(val) {
		setString(this, 'text', val);
	}

	get url() {
		return getURL(this, 'url', { fallback: new URL(location.pathname, location.origin) });
	}

	set url(val) {
		setURL(this, 'url', val);
	}

	static get observedAttributes() {
		return ['disabled'];
	}
});
