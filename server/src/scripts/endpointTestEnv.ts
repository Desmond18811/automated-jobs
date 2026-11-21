/** Env for testEndpoints.ts. Imported first so config/env.ts sees these values. */
process.env.NODE_ENV = 'test';
// The /api/test/* demo routes are off unless explicitly enabled; this suite still covers them.
process.env.ENABLE_TEST_ROUTES = 'true';
export {};
