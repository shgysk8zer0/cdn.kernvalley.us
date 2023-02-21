import { text, attr, hide, unhide } from '../../js/std-js/dom.js';
import { getHTML } from '../../js/std-js/http.js';
import { loadStylesheet, loadImage } from '../../js/std-js/loader.js';
import { purify as policy } from '../../js/std-js/htmlpurify.js';
import { whenIntersecting } from '../../js/std-js/intersect.js';
import { getDeferred } from '../../js/std-js/promises.js';
import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { getURLResolver, callOnce } from '../../js/std-js/utility.js';
import { meta } from '../../import.meta.js';
import { getString, setString } from '../../js/std-js/attrs.js';

const resolveURL = getURLResolver({ base: meta.url, path: '/components/github/' });
const symbols = {
	shadow: Symbol('shadow'),
	timeout: Symbol('timeout'),
	controller: Symbol('controller'),
};

const ENDPOINT =  'https://api.github.com/repos/';

const getTemplate = callOnce(() => getHTML(resolveURL('./repo.html'), { policy }));

async function getJSON(url, { signal } = {}) {
	const key = `github-repo:${url}`;

	if (signal instanceof AbortSignal && signal.aborted) {
		throw signal.reason;
	} else if (key in sessionStorage) {
		const json = sessionStorage.getItem(key);
		return JSON.parse(json);
	} else {
		const resp = await fetch(url, {
			headers: new Headers({ Accept: 'application/json' }),
			mode: 'cors',
			signal,
		});

		if (resp.ok) {
			resp.clone().text().then(json => sessionStorage.setItem(key, json));
		}
		return resp.json();
	}
}

registerCustomElement('github-repo', class HTMLGitHubRepoElement extends HTMLElement {
	constructor({ user, repo } = {}) {
		super();

		Object.defineProperties(this, {
			[symbols.shadow]: {
				enumerable: false,
				configurable: false,
				writable: false,
				value: this.attachShadow({ mode: 'closed' }),
			},
			[symbols.timeout]: {
				enumerable: false,
				configurable: false,
				writable: true,
				value: NaN,
			},
			[symbols.controller]: {
				enumerable: false,
				configurable: false,
				writable: true,
				value: null,
			}
		});

		if (typeof repo === 'string') {
			this.repo = repo;
		}

		if (typeof user === 'string') {
			this.user = user;
		}
	}

	async attributeChangedCallback(name) {
		await this.ready;
		switch(name) {
			case 'repo':
			case 'user': {
				const controller = new AbortController();
				if (Number.isNaN(this[symbols.timeout])) {
					clearTimeout(this[symbols.timeout]);

					if (this[symbols.controller] instanceof AbortController && ! this[symbols.controller].aborted) {
						this[symbols.controller.abort(new DOMException('Timeout'))];
					}
				}

				this[symbols.controller] = controller;
				this[symbols.timeout] = setTimeout(() => this.render({ signal: controller.signal }), 50);

				break;
			}

			default:
				throw new Error(`Unhandled attribute changed: "${name}"`);
		}
	}

	async connectedCallback() {
		if (this.loading === 'lazy') {
			await whenIntersecting(this);
		}

		const [tmp] = await Promise.all([
			getTemplate().then(e => e.cloneNode(true)),
			loadStylesheet(resolveURL('./repo.css'), { parent: this[symbols.shadow] }),
		]);

		this[symbols.shadow].append(tmp);
		this.dispatchEvent(new Event('ready'));
	}

	async render({ signal } = {}) {
		if (signal instanceof AbortSignal && signal.aborted) {
			throw signal.reason;
		} else {
			await this.ready;
			const base = this[symbols.shadow];

			try {
				const { repo, user } = this;

				if (typeof user === 'string' && typeof repo === 'string') {
					const {
						name, description, homepage, html_url: url, has_issues: hasIssues, message: error,
						open_issues: openIssues, license: { name: license, key: licenseId, url: licenseURL } = {},
						owner: { login: username, avatar_url: image, html_url: profile  } = {},
					} = await getJSON(new URL(`./${user}/${repo}`, ENDPOINT), { signal });

					if (typeof error === 'string' && error.length !== 0) {
						throw new Error(error);
					}

					text('[part~="name"]', name, { base });
					hide('[part~="error"]', { base });
					attr('[part~="repo-link"]', { href: url }, { base });
					text('[part~="username"]',username, { base });

					if (typeof description === 'string') {
						unhide('[part~="description"]', { base });
						text('[part~="description"]', description, { base });
					} else {
						hide('[part~="description"]', { base });
					}

					if (typeof homepage === 'string' && homepage.startsWith('https://')) {
						text('[part~="homepage-text"]', new URL(homepage).hostname, { base });
						attr('[part~="homepage-url"]', { href: homepage }, { base });
						unhide('[part~="homepage"]', { base });
					} else {
						hide('[part~="homepage"]', { base });
					}

					if (typeof licenseId === 'string' && typeof licenseURL === 'string') {
						text('[part~="license-name"]', license, { base });
						attr('[part~="license-url"]', {
							href: new URL(`./${licenseId}/`, 'http://choosealicense.com/licenses/').href,
						}, { base });
						unhide('[part~="license"]', { base });
					} else {
						hide('[part~="license"]', { base });
					}

					if (typeof image === 'string') {
						try {
							const avatar = await loadImage(image, { height: 48, width: 48 });
							base.querySelector('[part~="avatar"]').replaceChildren(avatar);
							unhide('[part~="avatar"]', { base });
						} catch(err) {
							console.error(err);
							hide('[part~="avatar"]', { base });
						}
					} else {
						hide('[part~="avatar"]', { base });
					}

					if (hasIssues && Number.isSafeInteger(openIssues)) {
						attr('[part~="issues-link"]', { href: new URL('./issues', `${url}/`).href }, { base }),
						// This is sometimes off for unknown reasons
						text('[part~="issue-count"]', openIssues.toString(), { base });
						unhide('[part~="issues"]', { base });
					} else {
						hide('[part~="issues"]', { base });
					}

					attr('[part~="profile-link"]', { href: profile }, { base });
					unhide('[part~="container"]', { base });
				}
			} catch(err) {
				console.error(err);
				text('[part~="error-message"]', err, { base });
				hide ('[part~="container"]', { base });
				unhide('[part~="error"]', { base });
			} finally {
				this[symbols.timeout] = NaN;
				this[symbols.controller] = null;
			}
		}
	}

	get loading() {
		return getString(this, 'loading', { fallback: 'eager' });
	}

	set loading(val) {
		setString(this, 'loading', val);
	}

	get ready() {
		const { resolve, promise } = getDeferred();

		if (this.isConnected && this[symbols.shadow].childElementCount > 1) {
			resolve();
		} else {
			this.addEventListener('ready', () => resolve(), { once: true });
		}

		return promise;
	}

	get repo() {
		return getString(this, 'repo');
	}

	set repo(val) {
		setString(this, 'repo', val);
	}

	get user() {
		return getString(this, 'user');
	}

	set user(val) {
		setString(this, 'user', val);
	}

	static get observedAttributes() {
		return [
			'repo',
			'user',
		];
	}
});
