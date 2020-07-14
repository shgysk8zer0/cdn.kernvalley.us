import CustomElement from '../custom-element.js';

CustomElement.register('notification-request', class HTMLNotificationRequestElement extends CustomElement {
	constructor() {
		super();

		if (! ('Notification' in window)) {
			this.remove();
		} else if (['granted', 'denied'].includes(Notification.permission)) {
			this.hidden = true;
		}

		this.addEventListener('click', async () => {
			const resp = await Notification.requestPermission();
			console.info(resp);
		});

		this.attachShadow({mode: 'open'});
		this.getTemplate('/components/notification/request.html').then(tmp => {
			this.shadowRoot.append(tmp);
			this.dispatchEvent(new Event('ready'));
		});
	}
});
