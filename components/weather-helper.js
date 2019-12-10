export const ENDPOINT = 'https://api.openweathermap.org';
export const ICON_SRC = 'https://openweathermap.org/img/wn/'
export const VERSION = 2.5;
const SVGNS = 'http://www.w3.org/2000/svg';
export const shadows = new Map();

export function getIconSrc(icon) {
	return new URL(`${icon}@2x.png`, ICON_SRC).href;
}

export function createIcon(symbol, owner = document) {
	const svg = document.createElementNS(SVGNS, 'svg');
	svg.classList.add('current-color');
	const sprite = owner.getElementById(symbol);
	svg.setAttributeNS(null, 'viewBox', sprite.getAttribute('viewBox'));
	for (const child of sprite.children) {
		svg.appendChild(child.cloneNode(true));
	}
	return svg;
}

export function getIcon(icon) {
	const img = new Image();
	img.decoding = 'async';
	img.src = getIconSrc(icon);
	img.slot = 'icon';
	return img;
}

export async function getForecastByPostalCode(appId, postalCode, {units = 'imperial', country = 'us', lang = 'en'} = {}) {
	const url = new URL(`/data/${VERSION}/forecast`, ENDPOINT);
	url.searchParams.set('appid', appId);
	url.searchParams.set('zip', `${postalCode},${country}`);
	url.searchParams.set('units', units);
	url.searchParams.set('lang', lang);

	const resp = await fetch(url, {
		headers: new Headers({Accept: 'application/json'}),
		mode: 'cors',
		credentials: 'omit',
	});

	if (resp.ok) {
		return await resp.json();
	} else {
		throw new Error(`${resp.url} [${resp.status} ${resp.statusText}]`);
	}
}

export async function getWeatherByPostalCode(appId, postalCode, {units = 'imperial', country = 'us', lang = 'en'} = {}) {
	const url = new URL(`/data/${VERSION}/weather`, ENDPOINT);
	url.searchParams.set('appid', appId);
	url.searchParams.set('zip', `${postalCode},${country}`);
	url.searchParams.set('units', units);
	url.searchParams.set('lang', lang);

	const resp = await fetch(url, {
		headers: new Headers({Accept: 'application/json'}),
		mode: 'cors',
		credentials: 'omit',
	});

	if (resp.ok) {
		return await resp.json();
	} else {
		throw new Error(`${resp.url} [${resp.status} ${resp.statusText}]`);
	}
}

export async function getSlot(el, name) {
	await el.ready;
	if (shadows.has(el)) {
		return shadows.get(el).querySelector(`slot[name="${name}"]`);
	} else {
		return null;
	}
}

export async function getAssigned(el, name) {
	const slot = await getSlot(el, name);
	if (slot instanceof HTMLElement) {
		return slot.assignedNodes();
	} else {
		return [];
	}
}

export async function clearSlot(el, name) {
	const assigned = await getAssigned(el, name);
	assigned.forEach(el => el.remove());
}
