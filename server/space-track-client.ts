import axios from 'axios';

const SPACETRACK_BASE_URL = 'https://www.space-track.org';

interface SpaceTrackAuth {
  email: string;
  password: string;
}

interface TLEData {
  NORAD_CAT_ID: string;
  OBJECT_NAME: string;
  OBJECT_TYPE: string;
  TLE_LINE1: string;
  TLE_LINE2: string;
  EPOCH: string;
  MEAN_MOTION: string;
  ECCENTRICITY: string;
  INCLINATION: string;
  RA_OF_ASC_NODE: string;
  ARG_OF_PERICENTER: string;
  MEAN_ANOMALY: string;
  EPHEMERIS_TYPE: string;
  CLASSIFICATION_TYPE: string;
  ELEMENT_SET_NO: string;
  REV_AT_EPOCH: string;
  BSTAR: string;
  MEAN_MOTION_DOT: string;
  MEAN_MOTION_DDOT: string;
}

export class SpaceTrackClient {
  private auth: SpaceTrackAuth;
  private cookieJar: string | null = null;
  private lastLoginTime: number = 0;
  private readonly LOGIN_EXPIRY = 1000 * 60 * 60; // 1 hour

  constructor(email: string, password: string) {
    this.auth = { email, password };
  }

  /**
   * Login to Space-Track.org and get session cookie
   */
  private async login(): Promise<void> {
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

      // Extract cookies from response
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        this.cookieJar = cookies.join('; ');
        this.lastLoginTime = Date.now();
        console.log('Space-Track login successful');
      } else {
        throw new Error('No cookies received from Space-Track login');
      }
    } catch (error) {
      console.error('Space-Track login failed:', error);
      throw new Error(`Failed to login to Space-Track: ${error}`);
    }
  }

  /**
   * Ensure we have a valid session
   */
  private async ensureAuthenticated(): Promise<void> {
    const now = Date.now();
    if (!this.cookieJar || (now - this.lastLoginTime) > this.LOGIN_EXPIRY) {
      await this.login();
    }
  }

  /**
   * Fetch TLE data for a specific catalog
   * @param catalog - 'active', 'analyst', 'all', or specific NORAD ID
   * @param limit - Maximum number of objects to return
   */
  async getTLEData(catalog: string = 'active', limit: number = 10000): Promise<TLEData[]> {
    await this.ensureAuthenticated();

    console.log(`Fetching TLE data for catalog: ${catalog}, limit: ${limit}`);

    try {
      let queryUrl = `${SPACETRACK_BASE_URL}/basicspacedata/query/class/gp/`;

      // Build query based on catalog type
      if (catalog === 'active') {
        // Get only active satellites (not decayed)
        queryUrl += `DECAY_DATE/null-val/EPOCH/>now-30/orderby/NORAD_CAT_ID/limit/${limit}/format/json`;
      } else if (catalog === 'analyst') {
        // Get analyst objects (typically debris and rocket bodies)
        queryUrl += `OBJECT_TYPE/DEBRIS,ROCKET%20BODY/DECAY_DATE/null-val/EPOCH/>now-30/orderby/NORAD_CAT_ID/limit/${limit}/format/json`;
      } else if (catalog === 'all') {
        // Get everything (use with caution, can be very large)
        queryUrl += `DECAY_DATE/null-val/EPOCH/>now-30/orderby/NORAD_CAT_ID/limit/${limit}/format/json`;
      } else if (/^\d+$/.test(catalog)) {
        // Specific NORAD ID
        queryUrl += `NORAD_CAT_ID/${catalog}/orderby/EPOCH%20desc/limit/1/format/json`;
      } else {
        throw new Error(`Invalid catalog type: ${catalog}`);
      }

      const response = await axios.get<TLEData[]>(queryUrl, {
        headers: {
          Cookie: this.cookieJar || '',
        },
        timeout: 60000, // 60 second timeout for large queries
      });

      console.log(`Received ${response.data.length} TLE records`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch TLE data:', error);
      throw new Error(`Failed to fetch TLE data: ${error}`);
    }
  }

  /**
   * Search for objects by name
   */
  async searchByName(name: string, limit: number = 100): Promise<TLEData[]> {
    await this.ensureAuthenticated();

    console.log(`Searching for objects with name: ${name}`);

    try {
      const queryUrl = `${SPACETRACK_BASE_URL}/basicspacedata/query/class/gp/OBJECT_NAME/~~${encodeURIComponent(name)}/DECAY_DATE/null-val/EPOCH/>now-30/orderby/NORAD_CAT_ID/limit/${limit}/format/json`;

      const response = await axios.get<TLEData[]>(queryUrl, {
        headers: {
          Cookie: this.cookieJar || '',
        },
      });

      console.log(`Found ${response.data.length} objects matching "${name}"`);
      return response.data;
    } catch (error) {
      console.error('Failed to search by name:', error);
      throw new Error(`Failed to search by name: ${error}`);
    }
  }
}
