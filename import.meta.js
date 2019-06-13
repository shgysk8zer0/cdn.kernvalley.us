export const base = new URL('../', import.meta.url);

export const {
	origin,
	host,
	hostname,
	port,
	protocol,
	href,
} = base;
