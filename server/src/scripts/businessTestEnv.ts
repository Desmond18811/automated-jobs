/** Env for testBusinessMode.ts. Imported first so config/env.ts sees these values. */
const live = process.argv.includes('--live');
Object.assign(process.env, {
  NODE_ENV: 'test',
  ALLOW_PRIVATE_URLS: 'true',
  OSM_CONTACT: 'javi-test',
  ...(live ? {} : { OSM_NOMINATIM_URL: 'http://127.0.0.1:9459/nominatim', OSM_OVERPASS_URL: 'http://127.0.0.1:9459/overpass' }),
});
export const LIVE_OSM = live;
export const MOCK_PORT = 9459;
