import axios from 'axios';

const SPACETRACK_BASE_URL = 'https://www.space-track.org';

export class SpaceTrackClient {
  constructor(email, password) {
    this.auth = { email, password };
    this.cookieJar = null;
    this.lastLoginTime = 0;
    this.LOGIN_EXPIRY = 1000 * 60 * 60; // 1 hour
  }

  async login() {
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
    } catch (error) {
      console.error('Space-Track login failed:', error.message);
      throw new Error(`Failed to login to Space-Track: ${error.message}`);
    }
  }

  async ensureAuthenticated() {
    const now = Date.now();
    if (!this.cookieJar || (now - this.lastLoginTime) > this.LOGIN_EXPIRY) {
      await this.login();
    }
  }

  async getObjectCount(catalog = 'active') {
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

      // Space-Track returns metadata in request_metadata.Total field
      const count = response.data?.request_metadata?.Total || 0;
      console.log(`Total objects in ${catalog}: ${count}`);
      return count;
    } catch (error) {
      console.error('Failed to get object count:', error.message);
      throw new Error(`Failed to get object count: ${error.message}`);
    }
  }

  async searchByName(name, limit = 10) {
    await this.ensureAuthenticated();

    console.log(`Searching for objects with name: ${name}`);

    try {
      // Search by object name (case-insensitive)
      const queryUrl = `${SPACETRACK_BASE_URL}/basicspacedata/query/class/gp/OBJECT_NAME/~~${encodeURIComponent(name)}/DECAY_DATE/null-val/orderby/EPOCH%20desc/limit/${limit}/format/json`;

      const response = await axios.get(queryUrl, {
        headers: {
          Cookie: this.cookieJar || '',
        },
        timeout: 30000,
      });

      console.log(`Found ${response.data.length} objects matching "${name}"`);
      return response.data;
    } catch (error) {
      console.error('Failed to search by name:', error.message);
      throw new Error(`Failed to search by name: ${error.message}`);
    }
  }

  async getTLEData(catalog = 'active', limit = 10000) {
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

      const response = await axios.get(queryUrl, {
        headers: {
          Cookie: this.cookieJar || '',
        },
        timeout: 60000,
      });

      console.log(`Received ${response.data.length} TLE records`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch TLE data:', error.message);
      throw new Error(`Failed to fetch TLE data: ${error.message}`);
    }
  }
}
