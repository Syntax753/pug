// Polyfill for Node.js OS module in browser environments
if (typeof window !== 'undefined') {
  // Create a mock OS module for browser environments
  const mockOs = {
    platform: () => 'browser',
    type: () => 'Browser',
    release: () => navigator.userAgent,
    hostname: () => 'browser',
    arch: () => 'javascript',
    homedir: () => '/',
    tmpdir: () => '/',
    EOL: '\n',
    endianness: () => 'LE',
    cpus: () => [{ model: 'Browser CPU', speed: 0 }],
    freemem: () => 1024 * 1024 * 1024, // 1GB
    totalmem: () => 4 * 1024 * 1024 * 1024, // 4GB
    networkInterfaces: () => ({}),
    userInfo: () => ({ username: 'browser', uid: -1, gid: -1, shell: null, homedir: '/' })
  };

  // Add the mock OS module to the window object
  (window as any).require_os = () => mockOs;
}

export {};