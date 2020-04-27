import { meta } from '../../import.meta.js';

const now = new Date();

customElements.define('calendar-view', class CalendarElement extends HTMLElement {
	constructor(month = null, year = null) {
		super();
		this.attachShadow({mode: 'open'});

		if (typeof month ===  'number') {
			this.month = month;
		}

		if (typeof year === 'number') {
			this.year = year;
		}

		fetch(new URL('./components/calendar-view.html', meta.url)).then(async resp => {
			const parser = new DOMParser();
			const html = await resp.text();
			const doc = parser.parseFromString(html, 'text/html');

			doc.getElementById('today').addEventListener('click', () => {
				this.month = now.getMonth() + 1;
				this.year = now.getFullYear();
			});

			doc.getElementById('prev').addEventListener('click', () => this.month--);
			doc.getElementById('next').addEventListener('click', () => this.month++);

			const month = doc.querySelector('[name="month"]');
			const year = doc.querySelector('[name="year"]');

			year.value = this.year;
			month.value = this.month;
			month.addEventListener('change', event => this.month = event.target.value);
			year.addEventListener('change', event => this.year = event.target.value);

			this.shadowRoot.append(...doc.head.children, ...doc.body.children);
			this.render();
			this.dispatchEvent(new Event('ready'));
		});
	}

	get ready() {
		return new Promise(resolve => {
			if (this.loaded) {
				resolve();
			} else {
				this.addEventListener('ready', () => resolve(), {once: true});
			}
		});
	}

	get loaded() {
		return this.shadowRoot !== null && this.shadowRoot.childElementCount !== 0;
	}

	get days() {
		return [...this.shadowRoot.querySelectorAll('.day')];
	}

	get month() {
		return parseInt(this.getAttribute('month')) || now.getMonth() + 1;
	}

	set month(val) {
		const month = parseInt(val);
		if (Number.isNaN(month) || month > 13) {
			throw new Error(`Invalid month: "${val}"`);
		} else if (month === 13) {
			this.setAttribute('month', 1);
			this.year++;
		} else if (month === 0) {
			this.setAttribute('month', 12);
			this.year--;
		} else {
			this.setAttribute('month', month);
		}
	}

	get year() {
		return parseInt(this.getAttribute('year')) || now.getFullYear();
	}

	set year(val) {
		this.setAttribute('year', val);
	}

	get min() {
		if (this.hasAttribuite('min')) {
			return new Date(this.getAttribute('min'));
		} else {
			return null;
		}
	}

	set min(val) {
		this.setAttribute('min', val);
	}

	get max() {
		if (this.hasAttribuite('max')) {
			return new Date(this.getAttribute('max'));
		} else {
			return null;
		}
	}

	set max(val) {
		this.setAttribute('max', val);
	}

	set value(val) {
		val = val.toString();
		this.days.forEach(td => td.classList.remove('selected-day'));
		const selected = this.days.find(td => td.textContent === val);

		if (selected instanceof HTMLElement) {
			selected.classList.add('selected-day');
			this.dispatchEvent(new CustomEvent('datechange', {
				detail: {
					date: this.value,
				}
			}));
		}
	}

	get value() {
		const selected = this.days.find(td => td.classList.contains('selected-day'));

		if (selected instanceof HTMLElement) {
			return `${this.year}-${this.month.toString().padStart(2, '0')}-${selected.textContent.padStart(2, '0')}`;
		} else {
			return null;
		}
	}

	attributeChangedCallback(name/*, oldVal, newVal*/) {
		switch(name) {
		case 'year':
		case 'month':
			this.render();
			break;
		}
	}

	static get observedAttributes() {
		return [
			'month',
			'year',
		];
	}

	async render() {
		await this.ready;
		this.shadowRoot.querySelector('[name="year"]').value = this.year;
		this.shadowRoot.querySelector('[name="month"]').value = this.month;
		const table = this.shadowRoot.querySelector('table');
		const tbody = table.tBodies.item(0);
		const d = new Date();
		const month = this.month - 1;
		[...tbody.rows].forEach(el => el.remove());
		d.setMonth(month);
		d.setYear(this.year);
		d.setHours(0);
		d.setMinutes(0);
		d.setSeconds(0);
		d.setDate(1);
		let tr = document.createElement('tr');

		for (let n = 0; n < d.getDay(); n++) {
			const td = document.createElement('td');
			td.classList.add('empty-cell');
			tr.append(td);
		}

		for (let n = d.getDay(); n < 7; n++) {
			const td = document.createElement('td');
			const span = document.createElement('span');
			const slot = document.createElement('slot');
			slot.classList.add('date-content');
			slot.name = `date-${this.year}-${this.month.toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
			span.textContent = d.getDate();
			td.classList.add('day');
			td.append(span, slot);
			tr.append(td);
			d.setDate(d.getDate() + 1);
		}

		tbody.append(tr);

		while(d.getMonth() === month) {
			let tr = document.createElement('tr');
			let ignore = true;

			while(d.getMonth() === month && (ignore || d.getDay() !== 0)) {
				ignore = false;

				const td = document.createElement('td');
				const span = document.createElement('span');
				const slot = document.createElement('slot');
				slot.classList.add('date-content');
				slot.name = `date-${this.year}-${this.month.toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
				span.textContent = d.getDate();
				td.classList.add('day');
				td.append(span, slot);
				tr.append(td);
				d.setDate(d.getDate() + 1);
			}

			tbody.append(tr);
		}

		this.days.forEach(cell => cell.addEventListener('click', event => {
			this.value = parseInt(event.target.textContent);
			const slot = event.target.closest('td').querySelector('slot.date-content');
			const nodes = slot.assignedNodes();

			if (nodes.length === 1) {
				const dialog = document.createElement('dialog');
				const header = document.createElement('header');
				const close = document.createElement('button');

				close.textContent = 'X';
				close.type = 'button';
				close.classList.add('float-right', 'btn', 'btn-primary');

				close.addEventListener('click', () => {
					dialog.close();
					dialog.remove();
				});

				header.append(close);
				header.classList.add('clearfix', 'sticky', 'top');
				dialog.append(header, document.createElement('hr'), nodes[0].cloneNode(true));
				document.body.append(dialog);
				dialog.showModal();
			}
		}));
	}

	async setContent(...data) {
		await Promise.all(data.map(({date, node}) => this.setDateContent({date, node})));
	}

	async setDateContent({date, node}) {
		if (! (date instanceof Date) || ! (node instanceof HTMLElement)) {
			throw new Error('Must be given a `Date` and Element');
		} else {
			node.slot = `date-${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
			this.append(node);
		}
	}
});
