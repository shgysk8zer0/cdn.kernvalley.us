export async function setTheme(value, { name = 'theme', domain = null, expires = null, strict = true, sameSite = 'Lax' } = {}) {
	return cookieStore.set({ name, value, domain, expires, strict, sameSite });
}

export async function getTheme({ name = 'theme', domain = null } = {}) {
	const { value = 'auto' } = await cookieStore.get({ name, domain });
	return value;
}

export async function themeChangeHandler({ name = 'theme' } = {}) {
	cookieStore.addEventListener('change', ({ changed }) => {
		const cookie = changed.find(cookie => cookie.name === name);

		if (cookie) {
			document.dispatchEvent(new CustomEvent('themechange', { detail: cookie.value }));
		}
	});

	const cookie = await cookieStore.get({ name });

	if (cookie) {
		document.dispatchEvent(new CustomEvent('themechange', { detail: cookie.value }));
	}
}
