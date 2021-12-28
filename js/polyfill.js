/* global globalThis */
import './std-js/shims.js';
import 'https://flackr.github.io/scroll-timeline/dist/scroll-timeline.js';
import { polyfill as cookieStorePolyfill } from './std-js/CookieStore.js';
import { polyfill as sanitizerPolyfill } from './std-js/Sanitizer.js';
import { polyfill as lockPolyfill } from './std-js/LockManager.js';
import { URLPattern as URLPatternShim } from 'https://unpkg.com/urlpattern-polyfill@1.0.0-rc1/dist/index.modern.js';

if (! ('URLPattern' in globalThis)) {
	globalThis.URLPattern = URLPatternShim;
}

Promise.allSettled([
	lockPolyfill(),
	cookieStorePolyfill(),
	sanitizerPolyfill(),
]);
