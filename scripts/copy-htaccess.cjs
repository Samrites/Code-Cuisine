/** Copies Apache routing rules after an Angular build on Windows, macOS and Linux. */
require('node:fs').copyFileSync('public/.htaccess', 'dist/code-cuisine/browser/.htaccess');
