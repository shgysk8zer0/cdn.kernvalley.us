export default class HTMLYouTubeVideoElement extends HTMLElement {
	async connectedCallback() {
		const shadow = this.attachShadow({mode: 'closed'});
		const iframe = document.createElement('iframe');
		iframe.height = this.height;
		iframe.width = this.width;
		iframe.frameBorder = 0;
		iframe.allowFullscreen = true;
		iframe.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture');
		iframe.src = new URL(this.embed, this.baseURL);
		shadow.append(iframe);
	}

	get privacy() {
		return this.hasAttribute('privacy');
	}

	set privacy(privacy) {
		this.toggleAttribute('privacy', privacy);
	}

	get url() {
		return this.hasAttribute('url') ? new URL(this.getAttribute('url')) : null;
	}

	get embed() {
		const embed = this.getAttribute('embed');
		try {
			const url = new URL(embed);
			if (url.host === 'youtu.be') {
				return url.pathname.substr(1);
			} else if (!url.host.endsWith('youtube.com')) {
				throw new Error('Invalid URL for YouTube');
			} else if (url.searchParams.has('v')) {
				return url.searchParams.get('v');
			} else if (url.pathname.startsWith('embed')) {
				return url.pathname.split('/')[2];
			} else {
				return embed;
			}
		} catch(err) {
			return embed;
		}
	}

	set embed(url) {
		this.setAttribute('embed', url);
	}

	get v() {
		return this.getAttribute('v');
	}

	set v(id) {
		this.setAttribute('v', id);
	}

	get baseURL() {
		return this.privacy ? 'https://www.youtube-nocookie.com/embed/'  : 'https://www.youtube.com/embed';
	}

	get height() {
		return parseInt(this.getAttribute('height'));
	}

	set height(height) {
		this.setAttribute('height', height);
	}

	get width() {
		return parseInt(this.getAttribute('width'));
	}

	set width(width) {
		this.setAttribute('width', width);
	}
}

customElements.define('youtube-video', HTMLYouTubeVideoElement);
