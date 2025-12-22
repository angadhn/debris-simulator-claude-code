import axios from 'axios';

const SPACETRACK_BASE_URL = 'https://www.space-track.org';

export interface SpaceTrackCredentials {
  email: string;
  password: string;
}

export interface SpaceTrackObject {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  NORAD_CAT_ID: string;
  OBJECT_TYPE: string;
  RCS_SIZE: string;
  COUNTRY_CODE: string;
  LAUNCH_DATE: string;
  EPOCH: string;
  MEAN_MOTION: string;
  ECCENTRICITY: string;
  INCLINATION: string;
  RA_OF_ASC_NODE: string;
  ARG_OF_PERICENTER: string;
  MEAN_ANOMALY: string;
  EPHEMERIS_TYPE: string;
  ELEMENT_SET_NO: string;
  REV_AT_EPOCH: string;
  BSTAR: string;
  MEAN_MOTION_DOT: string;
  MEAN_MOTION_DDOT: string;
  SEMIMAJOR_AXIS: string;
  PERIOD: string;
  APOGEE: string;
  PERIGEE: string;
  TLE_LINE0: string;
  TLE_LINE1: string;
  TLE_LINE2: string;
}

export class SpaceTrackClient {
  private auth: SpaceTrackCredentials;
  private cookieJar: string | null = null;
  private lastLoginTime = 0;
  private readonly LOGIN_EXPIRY = 1000 * 60 * 60; // 1 hour

  constructor(email: string, password: string) {
    this.auth = { email, password };
  }

  async login(): Promise<void> {
    console.log('Logging in to Space-Track...');

    try {
      const response = await axios.post(
        `${SPACETRACK_BASE_URL}/ajaxauth/login`,
        new URLSearchParams({
          identity: this.auth.email,
          password: this.auth.password,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          maxRedirects: 0,
          validateStatus: (status) => status < 400,
        }
      );

      const cookies = response.headers['set-cookie'];
      if (cookies) {
        this.cookieJar = cookies.join('; ');
        this.lastLoginTime = Date.now();
        console.log('Space-Track login successful');
      } else {
        throw new Error('No cookies received from Space-Track login');
      }
    } catch (error: any) {
      console.error('Space-Track login failed:', error.message);
      throw new Error(`Failed to login to Space-Track: ${error.message}`);
    }
  }

  async ensureAuthenticated(): Promise<void> {
    const now = Date.now();
    if (!this.cookieJar || (now - this.lastLoginTime) > this.LOGIN_EXPIRY) {
      await this.login();
    }
  }

  async getObjectCount(catalog = 'active'): Promise<number> {
    await this.ensureAuthenticated();

    console.log(`Getting object count for catalog: ${catalog}`);

    try {
      let queryUrl = `${SPACETRACK_BASE_URL}/basicspacedata/query/class/gp/`;

      if (catalog === 'active') {
        queryUrl += `DECAY_DATE/null-val/EPOCH/>now-30/orderby/NORAD_CAT_ID/limit/1/metadata/true`;
      } else if (catalog === 'all') {
        queryUrl += `DECAY_DATE/null-val/orderby/NORAD_CAT_ID/limit/1/metadata/true`;
      } else {
        queryUrl += `DECAY_DATE/null-val/orderby/NORAD_CAT_ID/limit/1/metadata/true`;
      }

      const response = await axios.get(queryUrl, {
        headers: {
          Cookie: this.cookieJar || '',
        },
        timeout: 30000,
      });

      const count = response.data?.request_metadata?.Total || 0;
      console.log(`Total objects in ${catalog}: ${count}`);
      return count;
    } catch (error: any) {
      console.error('Failed to get object count:', error.message);
      throw new Error(`Failed to get object count: ${error.message}`);
    }
  }

  async searchByName(name: string, limit = 10): Promise<SpaceTrackObject[]> {
    await this.ensureAuthenticated();

    console.log(`Searching for objects with name: ${name}`);

    try {
      const queryUrl = `${SPACETRACK_BASE_URL}/basicspacedata/query/class/gp/OBJECT_NAME/~~${encodeURIComponent(name)}/DECAY_DATE/null-val/orderby/EPOCH%20desc/limit/${limit}/format/json`;

      const response = await axios.get<SpaceTrackObject[]>(queryUrl, {
        headers: {
          Cookie: this.cookieJar || '',
        },
        timeout: 30000,
      });

      console.log(`Found ${response.data.length} objects matching "${name}"`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to search by name:', error.message);
      throw new Error(`Failed to search by name: ${error.message}`);
    }
  }

  async getTLEData(catalog = 'active', limit = 10000): Promise<SpaceTrackObject[]> {
    await this.ensureAuthenticated();

    console.log(`Fetching TLE data for catalog: ${catalog}, limit: ${limit}`);

    try {
      let queryUrl = `${SPACETRACK_BASE_URL}/basicspacedata/query/class/gp/`;

      if (catalog === 'active') {
        queryUrl += `DECAY_DATE/null-val/EPOCH/>now-30/orderby/NORAD_CAT_ID/limit/${limit}/format/json`;
      } else if (catalog === 'analyst') {
        queryUrl += `OBJECT_TYPE/DEBRIS,ROCKET%20BODY/DECAY_DATE/null-val/EPOCH/>now-30/orderby/NORAD_CAT_ID/limit/${limit}/format/json`;
      } else if (catalog === 'all') {
        queryUrl += `DECAY_DATE/null-val/EPOCH/>now-30/orderby/NORAD_CAT_ID/limit/${limit}/format/json`;
      } else if (/^\d+$/.test(catalog)) {
        queryUrl += `NORAD_CAT_ID/${catalog}/orderby/EPOCH%20desc/limit/1/format/json`;
      } else {
        throw new Error(`Invalid catalog type: ${catalog}`);
      }

      const response = await axios.get<SpaceTrackObject[]>(queryUrl, {
        headers: {
          Cookie: this.cookieJar || '',
        },
        timeout: 60000,
      });

      console.log(`Received ${response.data.length} TLE records`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch TLE data:', error.message);
      throw new Error(`Failed to fetch TLE data: ${error.message}`);
    }
  }
}

// Singleton instance for serverless functions
let clientInstance: SpaceTrackClient | null = null;

export function getSpaceTrackClient(): SpaceTrackClient {
  if (!clientInstance) {
    const email = process.env.SPACETRACK_EMAIL;
    const password = process.env.SPACETRACK_PASSWORD;

    if (!email || !password) {
      throw new Error('SPACETRACK_EMAIL and SPACETRACK_PASSWORD environment variables are required');
    }

    clientInstance = new SpaceTrackClient(email, password);
  }

  return clientInstance;
}
