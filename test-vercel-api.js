#!/usr/bin/env node

/**
 * Test script for Vercel API endpoints
 * Usage: node test-vercel-api.js https://your-project.vercel.app
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';

console.log('🧪 Testing Vercel API endpoints...');
console.log('Base URL:', BASE_URL);
console.log('');

async function testEndpoint(name, url, expectedFields) {
  try {
    console.log(`Testing ${name}...`);
    const startTime = Date.now();

    const response = await fetch(url);
    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.error(`❌ ${name} failed with status ${response.status}`);
      const errorText = await response.text();
      console.error('   Error:', errorText.substring(0, 200));
      console.log('');
      return false;
    }

    const data = await response.json();
    const missingFields = expectedFields.filter(field => !(field in data));

    if (missingFields.length > 0) {
      console.error(`❌ ${name} missing fields: ${missingFields.join(', ')}`);
      console.log('');
      return false;
    }

    console.log(`✅ ${name} passed (${duration}ms)`);
    console.log(`   Response preview:`, JSON.stringify(data).substring(0, 150) + '...');
    console.log('');
    return true;
  } catch (error) {
    console.error(`❌ ${name} error:`, error.message);
    console.log('');
    return false;
  }
}

async function runTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const results = [];

  // Test 1: TLE Data Endpoint (small limit for testing)
  results.push(await testEndpoint(
    'GET /api/tle/active?limit=10',
    `${BASE_URL}/api/tle/active?limit=10`,
    ['source', 'count', 'data']
  ));

  // Test 2: Object Count Endpoint
  results.push(await testEndpoint(
    'GET /api/count/active',
    `${BASE_URL}/api/count/active`,
    ['source', 'count']
  ));

  // Test 3: Search Endpoint
  results.push(await testEndpoint(
    'GET /api/search?name=ISS&limit=5',
    `${BASE_URL}/api/search?name=ISS&limit=5`,
    ['query', 'count', 'data']
  ));

  // Test 4: Cache Hit (repeat first request)
  console.log('Testing cache...');
  results.push(await testEndpoint(
    'GET /api/tle/active?limit=10 (cached)',
    `${BASE_URL}/api/tle/active?limit=10`,
    ['source', 'count', 'data']
  ));

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log(`📊 Results: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All tests passed! API is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.');
    console.log('');
    console.log('Common issues:');
    console.log('  - Environment variables not set in Vercel dashboard');
    console.log('  - Space-Track credentials invalid');
    console.log('  - API endpoints not deployed correctly');
  }

  process.exit(passed === total ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
