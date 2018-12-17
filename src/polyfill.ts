import 'core-js/es7/reflect';
import 'core-js';
import 'zone.js/dist/zone'; // Included with Angular CLI.
if (!Element.prototype.matches) {
    Element.prototype.matches =
        (Element.prototype as any).msMatchesSelector ||
        Element.prototype.webkitMatchesSelector;
}
