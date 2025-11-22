// Polyfill for Node.js process object in browser environments
if (typeof window !== 'undefined' && typeof (window as any).process === 'undefined') {
  (window as any).process = {
    env: {},
    browser: true,
    version: '',
    versions: {},
    platform: 'browser',
    nextTick: (fn: Function) => setTimeout(fn, 0),
    cwd: () => '/',
    argv: [],
    stdout: {},
    stderr: {}
  };
}

export {};