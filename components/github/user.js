import { text, attr, remove, on } from '../../js/std-js/dom.js';
import { getJSON, getHTML } from '../../js/std-js/http.js';
import { meta } from '../../import.meta.js';
import { loadStylesheet } from '../../js/std-js/loader.js';
import { getDeferred } from '../../js/std-js/promises.js';
import { purify as policy } from '../../js/std-js/htmlpurify.js';
import { whenIntersecting } from '../../js/std-js/intersect.js';
import { getURLResolver, callOnce } from '../../js/std-js/utility.js';
import { getString, setString, getBool, setBool } from '../../js/std-js/attrs.js';

const ENDPOINT = 'https://api.github.com';
import HTMLCustomElement from '../custom-element.js';
const resolveURL = getURLResolver({ base : meta.url, path: '/components/github/' });
const getTemplate = callOnce(() => getHTML(resolveURL('./user.html', meta.url), { policy }));
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

HTMLCustomElement.register('github-user', class HTMLGitHubUserElement extends HTMLCustomElement {
	constructor(user = null) {
		super();

		this.attachShadow({ mode: 'open' });

		Promise.resolve().then(() => {
			if (typeof user === 'string') {
				this.user = user;
			}

			Promise.allSettled([
				this.whenLoad,
				this.whenConnected,
				whenIntersecting(this),
			]).then(() => {
				Promise.all([
					getTemplate().then(e => e.cloneNode(true)),
					loadStylesheet(resolveURL('./user.css'), { parent: this.shadowRoot }),
				]).then(([tmp]) => {
					this.shadowRoot.append(tmp);
					this.dispatchEvent(new Event('ready'));
				});
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
			case 'loading':
				this.lazyLoad(newVal === 'lazy');
				break;

			case 'user':
				if (typeof newVal === 'string' && newVal.length !== 0) {
					this.ready.then(async () => {
						try {
							const base = this.shadowRoot;
							const user = await getUser(this.user);

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

							if (user.company !== null) {
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

	static get observedAttributes() {
		return [
			'loading',
			'user',
		];
	}
});
