import { text, attr, remove, on } from '../../js/std-js/dom.js';
import { getJSON } from '../../js/std-js/http.js';
import { meta } from '../../import.meta.js';
import { loadStylesheet } from '../../js/std-js/loader.js';
import { getDeferred } from '../../js/std-js/promises.js';
import { whenIntersecting } from '../../js/std-js/intersect.js';
import { getURLResolver } from '../../js/std-js/utility.js';
import { getString, setString, getBool, setBool } from '../../js/std-js/attrs.js';
import { getTemplateLoader }  from '../../js/std-js/loader.js';
import { createPolicy } from '../../js/std-js/trust.js';
import { registerCustomElement } from '../../js/std-js/custom-elements.js';

const ENDPOINT = 'https://api.github.com';
const policy = createPolicy('github-user#html', { createHTML: input => input });
const resolveURL = getURLResolver({ base : meta.url, path: '/components/github/' });
const getTemplate = getTemplateLoader(resolveURL('./user.html'), { policy });

async function getUser(user) {
	const key = `github-user-${user}`;

	if (sessionStorage.hasOwnProperty(key)) {
		return JSON.parse(sessionStorage.getItem(key));
	} else {
		const data = await getJSON(new URL(`/users/${user}`, ENDPOINT));
		sessionStorage.setItem(key, JSON.stringify(data));
		return data;
	}
}

registerCustomElement('github-user', class HTMLGitHubUserElement extends HTMLElement {
	constructor(user = null) {
		super();

		this.attachShadow({ mode: 'open' });
		const internals = this.attachInternals();
		internals.states.add('--loading');

		Promise.resolve().then(() => {
			if (typeof user === 'string') {
				this.user = user;
			}

			Promise.all([
				this.whenLoad,
				this.whenConnected,
				whenIntersecting(this),
			]).then(() => Promise.all([
				getTemplate(),
				loadStylesheet(resolveURL('./user.css'), { parent: this.shadowRoot }),
			]).then(([tmp]) => {
				this.shadowRoot.append(tmp);
				this.dispatchEvent(new Event('ready'));
				internals.states.delete('--loading');
			})).catch(err => {
				console.error(err);
				internals.state.delete('--loading');
				internals.states.add('--error');
			});
		});
	}

	get ready() {
		const { resolve, promise } = getDeferred();

		if (this.shadowRoot.childElementCount < 2) {
			on([this], ['ready'], () => resolve(), { once: true });
		} else {
			resolve();
		}
		return promise;
	}

	get bio() {
		return getBool(this, 'bio');
	}

	set bio(val) {
		setBool(this, 'bio', val);
	}

	get user() {
		return getString(this, 'user');
	}

	set user(val) {
		setString(this, 'user', val);
	}

	attributeChangedCallback(name, oldVal, newVal) {
		switch(name) {
			case 'user':
				if (typeof newVal === 'string' && newVal.length !== 0) {
					Promise.all([
						getUser(newVal),
						this.ready,
					]).then(async ([user]) => {
						try {
							const base = this.shadowRoot;
							console.log(user);

							attr('[part~="avatar"]', {
								src: `${user.avatar_url}&s=64`,
								height: 64,
								width: 64,
							}, { base });

							text('[part~="username"]', user.login, { base });
							text('[part~="name"]', user.name, { base });
							attr('[part~="github"]', {
								href: user.html_url,
								title: `View ${user.login}'s profile on GitHub`,
							}, { base });

							if (user.bio !== null) {
								text('[part~="bio"]', user.bio, { base });
								attr('[part~="bio"]', { hidden: false }, { base });
							} else {
								attr('[part~="bio"]', { hidden: true }, { base });
							}

							if (user.location !== null) {
								text('[part~="location"]', user.location, { base });
								attr('[part~="location-container"]', { hidden: false }, { base });
							} else {
								attr('[part~="location-container"]', { hidden: true }, { base });
							}

							if (user.email !== null) {
								text('[part~="email"]', user.email, { base });
								attr('[part~="email"]',{ href: `mailto:${user.email}`}, { base });
								attr('[part~="email-container"]', { hidden: false }, { base });
							} else {
								attr('[part~="email-container"]', { hidden: true }, { base });
							}

							if (typeof user.company === 'string') {
								text('[part~="company"]', user.company, { base });
								attr('[part~="company"]', {
									href: `https://github.com/${user.company.replace('@', '')}`,
								}, { base });
								attr('[part~="company-container"]', { hidden: false }, { base });
							} else {
								attr('[part~="company-container"]', { hidden: true }, { base });
							}

							if (typeof user.blog === 'string' && user.blog.length !== 0) {
								const blog = new URL(user.blog);
								attr('[part~="blog"]', { href: blog.href }, { base });
								text('[part~="blog"]', blog.hostname, { base });
							} else {
								remove('[part~="blog-container"]', { base });
							}
						} catch(err) {
							console.error(err);
							this.hidden = true;
						}
					});
				}
				break;
		}
	}

	connectedCallback() {
		this.dispatchEvent(new Event('connected'));
	}

	static get observedAttributes() {
		return [
			'user',
		];
	}
});
