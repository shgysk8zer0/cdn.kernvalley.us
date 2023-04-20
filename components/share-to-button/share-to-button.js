// import HTMLCustomElement from '../custom-element.js';
import { HTMLCustomButtonElement } from '../button/custom.js';
import { hasGa, send } from '../../js/std-js/google-analytics.js';
import { popup } from '../../js/std-js/popup.js';
import { getHTML } from '../../js/std-js/http.js';
import { meta } from '../../import.meta.js';
import { getURLResolver, callOnce } from '../../js/std-js/utility.js';
import { loadStylesheet } from '../../js/std-js/loader.js';
import { getString, setString, getBool, setBool, getURL, setURL } from '../../js/std-js/attrs.js';
import { setUTMParams } from '../../js/std-js/utility.js';
import { createPolicy } from '../../js/std-js/trust.js';
import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import {
	Facebook, Twitter, Reddit, LinkedIn, Gmail, Pinterest, Email, Tumblr, Telegram, getShareURL,
} from '../../js/std-js/share-targets.js';

const protectedData = new WeakMap();

const labels = {
	facebook: 'Share this on Facebook',
	twitter: 'Share this on Twitter',
	reddit: 'Share this on Reddit',
	linkedin: 'Share this on LinkedIn',
	gmail: 'Share this via Gmail',
	pinterest: 'Share this on Pinterest',
	tumblr: 'Share this on Tumblr',
	telegram: 'Share this via Telegram',
	clipboard: 'Send this to your clipboard',
	print: 'Print this',
	email: 'Send this via email',
};

const resolveURL = getURLResolver({ base: meta.url, path: '/components/share-to-button/' });
export const policy = createPolicy('share-to-buttons#html', {
	createHTML: input => input,
});

const getTemplate = callOnce(() => getHTML(resolveURL('./share-to-button.html'), { policy }));

function log(btn) {
	if (hasGa()) {
		send({
			hitType: 'event',
			eventCategory: `${btn.tagName.toLowerCase()} | ${btn.target}`,
			eventAction: btn.url,
			eventLabel: btn.title || document.title,
			transport: 'beacon',
		});
	}
}

function updateLabel(el) {
	const { internals } = protectedData.get(el);
	internals.ariaLabel = labels[el.target.toLowerCase()] || 'No handler available for this button';
}

function openShare(target, { title, text, url, height = 360, width = 720, name = 'SharePopup' } = {}) {
	return popup(getShareURL(target, { title, text, url }), { height, width, name });
}

async function handler ({ type, key, isTrusted, currentTarget }) {
	if (isTrusted && ! currentTarget.disabled && (type === 'click' || key === 'Enter' || key === ' ')) {
		const { internals } = protectedData.get(currentTarget);
		internals.ariaPressed = 'true';
		const { shareTitle, target, url, text } = currentTarget;
		await share({ target, title: shareTitle, url, text }).catch(console.error);
		log(currentTarget);
		internals.ariaPressed = 'false';
	}
}

async function share({
	target,
	title = document.title,
	text = '',
	url = location.href,
}) {
	switch(target.toLowerCase()) {
		case 'facebook':
			openShare(Facebook, { title, text, url });
			break;

		case 'twitter':
			openShare(Twitter, { title, text, url });
			break;

		case 'reddit':
			openShare(Reddit, { title, text, url });
			break;

		case 'linkedin':
			openShare(LinkedIn, { title, text, url });
			break;

		case 'gmail':
			openShare(Gmail, { title, text, url });
			break;

		case 'pinterest':
			openShare(Pinterest, { title, text, url });
			break;

		case 'tumblr':
			openShare(Tumblr, { title, text, url });
			break;

		case 'telegram':
			openShare(Telegram, { title, text, url });
			break;

		case 'clipboard':
			if (typeof text === 'string' && text.length !== 0) {
				navigator.clipboard.writeText(`${title} <${url}>\n${text}`)
					.then(() => alert('Copied to clipboard'));
			} else {
				navigator.clipboard.writeText(`${title} <${url}>`)
					.then(() => alert('Copied to clipboard'));
			}
			break;

		case 'print':
			window.print();
			break;

		case 'email':
			openShare(Email, { title, text, url });
			break;

		default:
			throw new Error(`Unknown share target: ${target}`);
	}
}

registerCustomElement('share-to-button', class HTMLShareToButtonElement extends HTMLCustomButtonElement {
	constructor({ target = null, url = null, source = null, medium = null, content = null } = {}) {
		super();
		const shadow = this.attachShadow({ mode: 'open' });
		const internals = this.attachInternals();
		protectedData.set(this, { shadow, internals });

		getTemplate().then(tmp => tmp.cloneNode(true)).then(tmp => {
			const wasHidden = this.hidden;
			internals.ariaHasPopup = 'dialog';
			internals.ariaPressed = 'false';
			this.hidden = true;
			if (typeof target === 'string') {
				this.target = target;
			}

			if (typeof url === 'string') {
				this.url = url;
			}

			if (typeof source === 'string') {
				this.source = source;
			}

			if (typeof medium === 'string') {
				this.medium = medium;
			}

			if (typeof content === 'string') {
				this.content = content;
			}
			this.shadowRoot.append(tmp);

			loadStylesheet(resolveURL('./share-to-button.css'), { parent: this.shadowRoot }).then(() => {
				this.hidden = wasHidden;
				this.dispatchEvent(new Event('ready'));
			});
		});

		this.addEventListener('click', handler, { passive: true });
		this.addEventListener('keydown', handler, { passive: true });
	}

	get ready() {
		return new Promise(resolve => {
			if (this.shadowRoot.childElementCount === 0) {
				this.addEventListener('ready', () => resolve(this), {once: true});
			} else {
				resolve(this);
			}
		});
	}

	get content() {
		return getString(this, 'content', { fallback: 'share-to-button' });
	}

	set content(val) {
		setString(this, 'content', val);
	}

	get disabled() {
		return getBool(this, 'disabled');
	}

	set disabled(val) {
		protectedData.get(this).ariaDisabled = val ? 'true' : 'false';
		getBool(this, 'disabled', val);
	}

	get medium() {
		return getString(this, 'medium', { fallback: 'share' });
	}

	set medium(val) {
		setString(this, 'medium', val);
	}

	get source() {
		return getString(this, 'source');
	}

	set source(val) {
		setString(this, 'source', val);
	}

	get target() {
		return getString(this, 'target');
	}

	set target(val) {
		setString(this, 'target', val);
	}

	get url() {
		if (this.hasAttribute('url')) {
			const url = getURL(this, 'url');
			const { source, medium, content } = this;
			return setUTMParams(url, { source, medium, content }).href;
		} else {
			const { source, medium, content } = this;

			if (typeof source === 'string' && typeof medium === 'string') {
				const url = new URL(location.href);
				return setUTMParams(url, { source, medium, content }).href;
			} else {
				return location.href;
			}
		}
	}

	set url(val) {
		setURL(this, 'url', val);
	}

	get text() {
		return getString(this, 'text');
	}

	set text(val) {
		setString(this, 'text', val);
	}

	// `title` is not available, so use `sharetitle` / `shareTitle`

	get shareTitle() {
		return getString(this, 'sharetitle', { fallback: document.title });
	}

	set shareTitle(val) {
		setString(this, 'sharetitle', val);
	}

	get stack() {
		return getBool(this, 'stack');
	}

	set stack(val) {
		setBool(this, 'stack', val);
	}

	async attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'target':
				updateLabel(this);
				if (typeof newValue !== 'string' || newValue.length === 0) {
					this.hidden = true;
				} else if (newValue.toLowerCase() === 'clipboard') {
					this.hidden = ! (('clipboard' in navigator) && navigator.clipboard.writeText instanceof Function);
				} else {
					this.ready.then(() => {
						this.shadowRoot.getElementById('network').textContent = newValue;
					});
					this.hidden = false;
				}
				break;

			default:
				throw new Error(`Unhandled attribute change: ${name}`);
		}
	}

	static get observedAttributes() {
		return [
			'target',
		];
	}
});
