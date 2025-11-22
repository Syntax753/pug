// Browser polyfill for Node.js 'os' module
export function platform() {
  return 'browser';
}

export function type() {
  return 'Browser';
}

export function release() {
  return navigator.userAgent;
}

export function hostname() {
  return 'browser';
}

export function arch() {
  return 'javascript';
}

export function homedir() {
  return '/';
}

export function tmpdir() {
  return '/';
}

export const EOL = '\n';

export function endianness() {
  return 'LE';
}

export function cpus() {
  return [{ model: 'Browser CPU', speed: 0 }];
}

export function freemem() {
  return 1024 * 1024 * 1024; // 1GB
}

export function totalmem() {
  return 4 * 1024 * 1024 * 1024; // 4GB
}

export function networkInterfaces() {
  return {};
}

export function userInfo() {
  return { username: 'browser', uid: -1, gid: -1, shell: null, homedir: '/' };
}

// Default export for CommonJS compatibility
export default {
  platform,
  type,
  release,
  hostname,
  arch,
  homedir,
  tmpdir,
  EOL,
  endianness,
  cpus,
  freemem,
  totalmem,
  networkInterfaces,
  userInfo
};