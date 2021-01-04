import { getJSON } from '../../js/std-js/http.js';
export const ENDPOINT = 'https://api.openweathermap.org';
export const ICON_SRC = 'https://openweathermap.org/img/wn/';
export const VERSION = 2.5;
const TZ = '.' + new Date().toISOString().split('.').pop();
const dateString = date => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
const SVGNS = 'http://www.w3.org/2000/svg';
const DAYS = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
];
export const shadows = new Map();

export function getSprite(icon) {
	// @SEE https://openweathermap.org/weather-conditions
	switch(icon) {
		case '01d': return 'weather-clear';
		case '01n': return 'weather-clear-night';
		case '02d':
		case '03d':
		case '04d': return 'weather-few-clouds';
		case '02n':
		case '03n':
		case '04n': return 'weather-few-clouds-night';
		case '09d':
		case '09n': return 'weather-showers-scattered';
		case '10d':
		case '10n': return 'weather-showers';
		case '11d':
		case '11n': return 'weather-storm';
		case '13d':
		case '13n': return 'weather-snow';
		case '50d':
		case '50n': return 'weather-fog';
		default: return 'weather-storm';
	}
}

export function getIconSrc(icon) {
	return new URL(`${icon}@2x.png`, ICON_SRC).href;
}

export function createIcon(symbol, owner = document) {
	const sprite = owner.getElementById(symbol);
	const svg = document.createElementNS(SVGNS, 'svg');
	svg.setAttribute('fill', 'currentColor');
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
		const { city, list } = await resp.json();

		const forecast = list.reduce((forecast, entry) => {
			const date = new Date(entry.dt_txt.replace(' ', 'T') + TZ);
			const day = dateString(date);

			if (! forecast.hasOwnProperty(day)) {
				forecast[day] = {
					day,
					dow: DAYS[date.getDay()],
					date,
					high: Number.MIN_SAFE_INTEGER,
					low: Number.MAX_SAFE_INTEGER,
					times: [],
					conditions: null,
					icon: '01d',
				};
			}

			forecast[day].times.push({
				time: date.toLocaleTimeString(),
				conditions: entry.main,
				weather: entry.weather[0],
				cloud: entry.clouds,
				wind: entry.wind,
			});

			forecast[day].high = Math.max(forecast[day].high, entry.main.temp);
			forecast[day].low = Math.min(forecast[day].low, entry.main.temp);

			if (entry.weather[0].icon > forecast[day].icon) {
				forecast[day].icon = entry.weather[0].icon;
				forecast[day].conditions = entry.weather[0].description;
			}

			return forecast;
		}, {});
		return {city, forecast};
	} else {
		throw new Error(`${resp.url} [${resp.status} ${resp.statusText}]`);
	}
}

export async function getWeatherByPostalCode(appid, postalCode, {
	units = 'imperial',
	country = 'us',
	lang = 'en',
} = {}) {
	return await getJSON(new URL(`/data/${VERSION}/weather`, ENDPOINT), {
		body: {  appid, zip: `${postalCode},${country}`, units, lang }
	});
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

export async function clearSlots(el, ...names) {
	await el.ready;
	if (shadows.has(el)) {
		const shadow = shadows.get(el);
		names.forEach(name => {
			const slot = shadow.querySelector(`slot[name="${name}"]`);
			if (slot instanceof HTMLElement) {
				slot.assignedNodes().forEach(el => el.remove());
			}
		});

		return true;
	} else {
		return false;
	}
}
