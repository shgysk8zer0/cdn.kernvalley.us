import CustomElement from '../custom-element.js';

function fmt(num) {
	return new Intl.NumberFormat(navigator.language).format(num);
}

CustomElement.register('river-levels', class HTMLRiverLevelsElement extends CustomElement {
	constructor() {
		super();
		this.attachShadow({mode: 'open'});

		this.getTemplate('./components/river-levels/river-levels.html').then(tmp => {
			this.shadowRoot.append(tmp);
			this.dispatchEvent(new Event('ready'));
		});

		this.update();
	}

	async update() {
		await this.ready;
		const resp = await fetch('https://api.kernvalley.us/river/', {
			mode: 'cors',
		});

		if (resp.ok) {
			const [data] = await resp.json();
			const datetime = new Date(data.datetime);
			const time = document.createElement('time');
			const upperFlow = document.createElement('span');
			const lowerFlow = document.createElement('span');
			const storage = document.createElement('span');

			time.slot = 'time';
			upperFlow.slot = 'upper-flow';
			lowerFlow.slot = 'lower-flow';
			storage.slot = 'storage-value';

			time.textContent = datetime.toLocaleString();
			time.dateTime = datetime.toISOString();
			upperFlow.textContent = fmt(data.upper.flow.value);
			lowerFlow.textContent = fmt(data.lower.flow.value);
			storage.textContent = fmt(data.storage.value);

			const update = [time, upperFlow, lowerFlow, storage].map(el => el.slot);

			this.shadowRoot.querySelectorAll('slot').forEach(slot => {
				if (update.includes(slot.name)) {
					slot.assignedNodes().forEach(el => el.remove());
				}
			});

			this.replaceChildren(time, upperFlow, lowerFlow, storage);
		} else {
			throw new Error(`${resp.url} [${resp.status} ${resp.statusText}]`);
		}
	}
});
