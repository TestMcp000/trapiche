const Module = require('node:module');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const testDistRoot = path.join(repoRoot, '.test-dist');

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  // Mock 'server-only' package to allow testing server-only modules
  // The package normally throws when imported outside Next.js server context
  if (request === 'server-only') {
    // Return path to a stub module (we create an inline one via require.cache)
    const stubPath = path.join(testDistRoot, '__server-only-stub__.js');
    if (!require.cache[stubPath]) {
      require.cache[stubPath] = {
        id: stubPath,
        filename: stubPath,
        loaded: true,
        exports: {},
      };
    }
    return stubPath;
  }

  if (request.startsWith('@/')) {
    const mapped = path.join(testDistRoot, request.slice(2));
    return originalResolveFilename.call(this, mapped, parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};
