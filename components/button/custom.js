const protectedData = new WeakMap();

export const states = {
	disabled: '--disabled',
};

export class HTMLCustomButtonElement extends HTMLElement {
	attachInternals() {
		const internals = super.attachInternals();
		protectedData.set(this, internals);
		return internals;
	}

	get disabled() {
		return this.hasAttribute('disabled');
	}

	set disabled(val) {
		this.toggleAttribute('disabled', val);
	}

	attributeChangedCallback(name, oldVal, newVal) {
		if (name === 'disabled') {
			const internals = protectedData.get(this);

			if (typeof newVal === 'string') {
				internals.ariaDisabled = 'true';
				internals.states.add(states.disabled);
			} else {
				internals.ariaDisabled = 'false';
				internals.states.delete(states.disabled);
			}
		}
	}

	connectedCallback() {
		if (! protectedData.has(this)) {
			this.attachInternals();
		}

		const internals = protectedData.get(this);

		if (! (this.hasAttribute('role') || typeof internals.role === 'string')) {
			internals.role = 'button';
		}

		if (! this.hasAttribute('tabindex')) {
			this.tabIndex = 0;
		}
	}

	static get observedAttributes() {
		return ['disabled'];
	}
}
