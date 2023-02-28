import { createElement } from '../../js/std-js/elements.js';
import { loadScript } from '../../js/std-js/loader.js';
import { registerCustomElement } from '../..//js/std-js/custom-elements.js';
import { getString, setString } from '../../js/std-js/attrs.js';
import { getDeferred } from '../../js/std-js/promises.js';
import { whenIntersecting } from '../../js/std-js/intersect.js';
import { callOnce } from '../../js/std-js/utility.js';
import { createPolicy } from '../../js/std-js/trust.js';

const script = 'https://assets.calendly.com/assets/external/widget.js';
const policy = createPolicy('calendly#script-url', {
	createScriptURL: input => {
		if (input !== script) {
			throw new TypeError(`Not a Calendly script URL: ${input}`);
		} else {
			return input;
		}
	}
});

const loadCalendlyScript = callOnce(() => loadScript(
	policy.createScriptURL(script),
	{ crossOrigin: null },
));

const protectedData = new WeakMap();

registerCustomElement('calendly-embed', class HTMLCalendlyEmbedElement extends HTMLElement {
	constructor({ user } = {}) {
		super();
		const { resolve, promise } = getDeferred();
		const shadow = this.attachShadow({ mode: 'closed' });

		shadow.append(createElement('div', { part: ['container'], id: 'container' }));
		protectedData.set(this, { shadow, promise });

		whenIntersecting(this).then(async () => {
			await loadCalendlyScript();
			resolve();
		});
		
		if (typeof user === 'string') {
			this.user = user;
		}
	}
	
	get user() {
		return getString(this, 'user');
	}
	
	set user(val) {
		setString(this, 'user', val);
	}
	
	get url() {
		return new URL(this.user, 'https://calendly.com/').href;
	}
	
	attributeChangedCallback(name, oldValue, newValue) {
		switch(name) {
			case 'user':
				this.dispatchEvent(new CustomEvent('userchange', { detail: { newValue, oldValue }}));

				if (typeof newValue === 'string') {
					this.init();
				}
				break;
		}
	}
	
	async init() {
		const { shadow, promise } = protectedData.get(this);
		
		if (typeof this.user !== 'string') {
			await Promise.all([
				promise,
				new Promise(resolve => this.addEventListener('userchange', () => resolve(), { once: true })),
			]);
		} else {
			await promise;
		}
		
		if ('Calendly' in globalThis) {
			const container = shadow.getElementById('container');
			container.replaceChildren();
			globalThis.Calendly.initInlineWidget({
				url: this.url,
				parentElement: container,
			});
		}
	}
	
	static get observedAttributes() {
		return ['user'];
	}
});

export const trustPolicies = [policy.name];
