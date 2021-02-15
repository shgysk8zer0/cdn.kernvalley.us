import { registerCustomElement } from '../js/std-js/custom-elements.js';

function getActions(req, cache) {
	const td = document.createElement('td');
	const delBtn = document.createElement('button');
	delBtn.textContent = 'Delete';
	delBtn.classList.add('btn', 'btn-reject');
	delBtn.addEventListener('click', async () => {
		if (confirm('Delete this entry?')) {
			await cache.delete(req);
			delBtn.closest('tr').remove();
		}
	});
	td.append(delBtn);
	return td;
}

registerCustomElement('cache-list', class HTMLCacheListElement extends HTMLTableElement {
	constructor(version = null) {
		super();
		[...this.children].forEach(el => el.remove());

		const caption = document.createElement('caption');
		const btn = document.createElement('button');
		const label = document.createElement('label');
		const sLabel = document.createElement('label');
		const select = document.createElement('select');
		const thead = document.createElement('thead');
		const tbody = document.createElement('tbody');
		const tr = document.createElement('tr');
		const search = document.createElement('input');
		const dfltOpt = document.createElement('option');
		dfltOpt.textContent = 'Select version';
		dfltOpt.value = '';
		label.textContent = 'Cache version: ';
		sLabel.textContent = 'Search for: ';
		search.type = 'search';
		search.autoComplete = 'off';
		search.placeholder = 'https://example.com/path.ext';
		select.classList.add('input');
		btn.textContent = 'Delete';

		thead.hidden = true;

		btn.classList.add('btn', 'btn-reject');

		search.addEventListener('change', ({ target }) => {
			if (target.value !== '') {
				[...this.tBodies.item(0).rows].forEach(row => {
					row.hidden = ! row.cells.item(0).textContent.includes(target.value);
				});
			} else {
				[...this.tBodies.item(0).rows].forEach(tr => tr.hidden = false);
			}
		}, {
			capture: true,
		});

		btn.addEventListener('click', () => {
			if (confirm(`Delete cache version: ${this.version}?`)) {
				caches.delete(this.version).then(() => {
					[...select.selectedOptions].forEach(el => {
						if (el.value) {
							el.remove();
						}
					});
					this.version = select.value;
				}).catch(console.error);
			}
		}, {
			capture: true
		});


		select.addEventListener('change', ({ target }) => {
			this.version = target.value;
		}, { capture: true });

		['URL', 'Method', 'Mode', 'Referrer Policy', 'Credentials', 'Integrity', 'Actions'].forEach(label => {
			const th = document.createElement('th');
			th.textContent = label;
			tr.append(th);
		});

		sLabel.append(search);
		caption.append('Cache Versions and Entries', document.createElement('br'), label, btn, document.createElement('br'), sLabel);
		thead.append(tr);
		this.append(caption, thead, tbody);

		caches.keys().then(vs => {
			const version = this.version;
			const opts = vs.map(v => {
				const opt = document.createElement('option');
				opt.value = v;
				opt.textContent = v;
				opt.checked = v === version;
				return opt;
			});
			select.append(dfltOpt, ...opts);
			label.append(select);
		});

		if (version) {
			this.ready.then(() => this.version = version);
		}
	}

	connectedCallback() {
		this.dispatchEvent(new Event('connected'));
	}

	attributeChangedCallback(name, oldVal, newVal) {
		switch(name) {
			case 'version':

				this.dispatchEvent(new CustomEvent('versionchange', { detail: { newVal, oldVal }}));

				if (typeof newVal === 'string' && newVal.length !== 0) {
					this.querySelector('caption select').value = newVal;
					caches.open(newVal).then(async cache => {
						const entries = await cache.keys();
						const tbody = this.tBodies.item(0);
						if (Array.isArray(entries)) {
							const rows = entries.map(({ url, method, mode, referrerPolicy, credentials, integrity }) => {
								const tr = document.createElement('tr');
								const cells = [url, method, mode, referrerPolicy, credentials, integrity].map(txt => {
									const td = document.createElement('td');
									td.textContent = txt;
									return td;
								});
								tr.append(...cells, getActions(url, cache));
								return tr;
							});
							[...tbody.rows].forEach(row => row.remove());
							const empty = rows.length === 0;
							this.tHead.hidden = ! empty;
							tbody.append(...rows);
						}
					});
				} else {
					[...this.tBodies.item(0).rows].forEach(tr => tr.remove());
					this.tHead.hidden = true;
				}
				break;

			default:
				throw new Error(`Unhandled attribute changed: ${name}`);
		}
	}

	get connected() {
		if (this.isConnected) {
			return Promise.resolve();
		} else {
			return new Promise(resolve => this.addEventListener('connected', () => resolve(), { once: true }));
		}
	}

	get ready() {
		return Promise.resolve();
	}

	get version() {
		return this.getAttribute('version');
	}

	set version(val) {
		if (typeof val === 'string' || typeof val === 'number') {
			this.setAttribute('version', val);
		} else {
			this.removeAttribute('version');
		}
	}

	static get observedAttributes() {
		return ['version'];
	}
}, {
	extends: 'table',
});
