import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

export interface TLEData {
  NORAD_CAT_ID: string;
  OBJECT_NAME: string;
  OBJECT_TYPE: string;
  TLE_LINE0: string;
  TLE_LINE1: string;
  TLE_LINE2: string;
  EPOCH: string;
  INCLINATION: string;
  ECCENTRICITY: string;
  MEAN_MOTION: string;
  SEMIMAJOR_AXIS: string;
  PERIOD: string;
  APOAPSIS: string;
  PERIAPSIS: string;
  COUNTRY_CODE: string;
  LAUNCH_DATE: string;
  RCS_SIZE: string;
}

export interface TLEResponse {
  source: 'cache' | 'spacetrack';
  count: number;
  data: TLEData[];
}

export class DebrisAPI {
  /**
   * Fetch TLE data for a catalog of objects
   * @param catalog - 'active', 'analyst', 'all', or specific NORAD ID
   * @param limit - Maximum number of objects to fetch
   * @param skipCache - Force refresh from Space-Track
   */
  static async getTLEData(
    catalog: string = 'active',
    limit: number = 5000,
    skipCache: boolean = false
  ): Promise<TLEResponse> {
    try {
      const response = await axios.get<TLEResponse>(
        `${API_BASE_URL}/api/tle/${catalog}`,
        {
          params: { limit, skipCache: skipCache ? 'true' : 'false' },
          timeout: 60000, // 60 second timeout
        }
      );

      console.log(`Fetched ${response.data.count} debris objects from ${response.data.source}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch TLE data:', error);
      throw new Error(`Failed to fetch debris data: ${error}`);
    }
  }

  /**
   * Check if the backend server is available
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }

  /**
   * Get total object count from Space-Track
   */
  static async getObjectCount(catalog: string = 'active'): Promise<number> {
    try {
      const response = await axios.get<{ source: string; count: number }>(
        `${API_BASE_URL}/api/count/${catalog}`,
        { timeout: 30000 }
      );
      console.log(`Total ${catalog} objects: ${response.data.count} (from ${response.data.source})`);
      return response.data.count;
    } catch (error) {
      console.error('Failed to get object count:', error);
      return 0; // Return 0 on error instead of throwing
    }
  }

  /**
   * Search objects by name
   */
  static async searchByName(name: string, limit: number = 10): Promise<TLEData[]> {
    try {
      const response = await axios.get<{ query: string; count: number; data: TLEData[] }>(
        `${API_BASE_URL}/api/search`,
        {
          params: { name, limit },
          timeout: 30000,
        }
      );
      console.log(`Found ${response.data.count} objects matching "${name}"`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to search objects:', error);
      throw new Error(`Failed to search objects: ${error}`);
    }
  }

  /**
   * Clear the server-side cache
   */
  static async clearCache(): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/api/tle/cache`);
      console.log('Server cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }
}
