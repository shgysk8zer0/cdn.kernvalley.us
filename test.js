try {
	document.querySelector('#main blockquote').innerHTML = 'hacked!';
} catch(err) {
	console.error(err);
}
