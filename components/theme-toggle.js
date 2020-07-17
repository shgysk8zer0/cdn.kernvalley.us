import { registerCustomElement } from '../js/std-js/functions.js';

registerCustomElement('theme-toggle', class HTMLThemeToggleElement extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({mode: 'open'});
		const light = document.createElement('button');
		const dark = document.createElement('button');
		const lightSlot = document.createElement('slot');
		const darkSlot = document.createElement('slot');
		const media = matchMedia('(prefers-color-scheme: dark)');

		light.type= 'button';
		light.title = 'Light theme';
		dark.type = 'button';
		dark.title = 'Dark theme';

		if ('part' in HTMLElement.prototype) {
			light.part.add('button', 'light-btn');
			dark.part.add('button', 'dark-btn');
		}

		lightSlot.name = 'light';
		lightSlot.textContent = 'light';
		darkSlot.name = 'dark';
		darkSlot.textContent = 'dark';

		light.append(lightSlot);
		dark.append(darkSlot);

		if (media.matches || document.documentElement.dataset.thene === 'dark') {
			dark.disabled = true;
		} else {
			light.disabled = true;
		}

		media.addListener(({matches}) => {
			this.dispatchEvent(new CustomEvent('themechange', {detail: matches ? 'dark' : 'light'}));
		});

		light.addEventListener('click', () => {
			this.dispatchEvent(new CustomEvent('themechange', {detail: 'light'}));
		}, {
			capture: true,
		});

		dark.addEventListener('click', () => {
			this.dispatchEvent(new CustomEvent('themechange', {detail: 'dark'}));
		}, {
			capture: true,
		});

		this.shadowRoot.append(light, dark);

		this.addEventListener('themechange', ({detail}) => {
			switch (detail) {
				case 'light':
					light.disabled = true;
					dark.disabled = false;
					document.documentElement.dataset.theme = 'light';
					break;

				case 'dark':
					light.disabled = false;
					dark.disabled = true;
					document.documentElement.dataset.theme = 'dark';
					break;

				default: throw new Error(`Unsupported theme: ${detail}`);
			}
		});
	}
});
