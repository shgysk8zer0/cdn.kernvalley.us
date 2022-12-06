import { createIframe } from '../js/std-js/elements.js';
function render(el) {
	const { shadowRoot, user, pen, theme, loading, tab, height, editable, clickToLoad } = el;
	const src = new URL(`https://codepen.io/${user}/embed/${clickToLoad ? 'preview/' : '/'}${pen}`);

	src.searchParams.set('default-tab', tab);
	src.searchParams.set('theme-id', theme);
	
	if (editable) {
		src.searchParams.set('editable', 'true');
	}
	const iframe = createIframe(src, {
		loading, height,
		sandbox: ['allow-scripts', 'allow-popups'],
		part: ['embed'],
	});

	iframe.allowTransparency = 'true';
	iframe.allowFullscreen = 'true';
	iframe.style.setProperty('width', '100%');

	shadowRoot.replaceChildren(iframe);
}
customElements.define('codepen-embed', class HTMLCodePenEmbedElement extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
	}
	
	connectedCallback() {
		render(this);
		this.dispatchEvent(new Event('connected'));
	}
	
	attributeChangedCallback() {
		if (this.isConnected && this.shadowRoot.childElementCount !== 0) {
			render(this);
		}
	}
	
	get clickToLoad() {
		return this.hasAttribute('clicktoload');
	}
	
	set clickToLoad(val) {
		this.toggleAttribute('clicktoload', val);
	}
	
	get editable() {
		return this.hasAttribute('editable');
	}
	
	set editable(val) {
		this.toggleAttribute('editable');
	}
	
	get height() {
		return parseInt(this.getAttribute('height')) || 300;
	}
	
	set height(val) {
		if (Number.isSafeInteger(val) && val > 0) {
			this.setAttribute('height', val);
		} else {
			this.removeAttribute('height');
		}
	}
	
	get loading() {
		return this.getAttribute('loading') || 'lazy';
	}
	
	set loading(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('loading', val);
		} else {
			this.removeAttribbute('loading');
		}
	}
	
	get pen() {
		return this.getAttribute('pen');
	}
	
	set pen(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('pen', val);
		} else {
			this.removeAttribbute('pen');
		}
	}
	
	get tab() {
		return this.getAttribute('tab') || 'result';
	}
	
	set tab(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('tab', val);
		} else {
			this.removeAttribbute('tab');
		}
	}
	
	get theme() {
		return this.getAttribute('theme') || 'default';
	}
	
	set theme(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('theme', val);
		} else {
			this.removeAttribbute('theme');
		}
	}
	
	get user() {
		return this.getAttribute('user');
	}
	
	set user(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('user', val);
		} else {
			this.removeAttribbute('user');
		}
	}
	
	static get observedAttributes() {
		return ['user', 'pen', 'tab', 'editable', 'height', 'theme', 'loading'];
	}
	
	static getPen({ user, pen, tab = 'result', editable = false, theme = 'default', loading = 'lazy', clickToLoad = false, height = 300 }) {
		const el = new HTMLCodePenEmbedElement();
		el.loading = loading;
		el.user = user;
		el.pen = pen;
		el.tab = tab;
		el.editable = editable;
		el.theme = theme;
		el.clickToLoad = clickToLoad;
		el.height = height;
		
		return el;
	}
});
