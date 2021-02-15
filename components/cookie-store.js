import { registerCustomElement } from '../js/std-js/custom-elements.js';

const COLS = ['name', 'value', 'expires', 'domain', 'path', 'sameSite', 'secure', 'actions'];

function makeDeleteBtn() {
	const td = document.createElement('td');
	const btn = document.createElement('button');

	btn.textContent = 'Delete';
	btn.classList.add('btn', 'btn-reject');
	btn.addEventListener('click', ({ target }) => {
		const tr = target.closest('tr');
		const name = tr.cells.item(0).textContent;

		if (confirm(`Delete cookie: ${name}`)) {
			window.cookieStore.delete(name);
		}
	});

	td.append(btn);

	return td;
}

function makeRow({ name, value, expires, secure, sameSite, path, domain }) {
	const tr = document.createElement('tr');
	const tds = [name, value, expires, domain, path, sameSite, secure].map(prop => {
		const td = document.createElement('td');

		if (typeof prop === 'string') {
			td.textContent = prop;
		} else if (typeof prop === 'number') {
			const time = document.createElement('time');
			const date = new Date(prop);
			time.textContent = date.toLocaleString();
			time.dateTime = date.toISOString();
			td.append(time);
		} else if (prop instanceof Date) {
			const time = document.createElement('time');
			time.textContent = prop.toLocaleString();
			time.dateTime = prop.toISOString();
			td.append(time);
		} else if (typeof prop === 'boolean') {
			td.textContent = prop ? 'yes' : 'no';
		} else if (typeof prop === 'undefined') {
			td.textContent = 'undefined';
		}

		return td;
	});
	tr.append(...tds, makeDeleteBtn());
	return tr;
}

function makeTHead() {
	const thead = document.createElement('thead');
	const tr = document.createElement('tr');
	const ths = COLS.map(prop => {
		const th = document.createElement('th');
		th.textContent = prop;
		return th;
	});

	tr.append(...ths);
	thead.append(tr);
	return tr;
}

function getCellByName(name, tr) {
	return tr.cells.item(COLS.indexOf(name));
}

function findByCookie({ name }, tbody) {
	return Array.from(tbody.rows).find(tr => {
		return getCellByName('name', tr).textContent === name;
	});
}

registerCustomElement('cookie-store', class HTMLCookieStoreTableElement extends HTMLTableElement {
	async connectedCallback() {
		const cookies = await window.cookieStore.getAll();
		window.cookieStore.addEventListener('change', ({ changed, deleted}) => {
			const tbody = this.tBodies.item(0);

			changed.forEach(({ name, value, expires, secure, sameSite, path, domain }) => {
				const tr = makeRow({ name, value, expires, secure, sameSite, path, domain });
				const found = findByCookie({ name, value, expires, secure, sameSite, path, domain }, tbody);

				if (found instanceof HTMLElement) {
					found.replaceWith(tr);
				} else {
					tbody.append(tr);
				}
			});

			deleted.forEach(({ name, value, expires, secure, sameSite, path, domain }) => {
				const found = findByCookie({ name, value, expires, secure, sameSite, path, domain }, tbody);

				if (found instanceof HTMLElement) {
					found.remove();
				}
			});
		});

		if (this.tBodies.length === 0) {
			this.append(document.createElement('tbody'));
		}

		if (! this.tHead) {
			this.append(document.createElement('thead'));
			this.tHead.append(makeTHead());
		}
		const rows = cookies.map(makeRow);
		this.tBodies.item(0).append(...rows);
	}
}, {
	extends: 'table',
});
