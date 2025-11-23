// Browser polyfill for Node.js 'process' module
const processBrowser = {
  env: {},
  browser: true,
  version: '',
  versions: {},
  platform: 'browser',
  nextTick: (fn) => setTimeout(fn, 0),
  cwd: () => '/',
  argv: [],
  stdout: {},
  stderr: {}
};

// Make process available globally
if (typeof window !== 'undefined') {
  window.process = processBrowser;
}

export default processBrowser;