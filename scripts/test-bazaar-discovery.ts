/**
 * Test script for CDP x402 Bazaar discovery
 */

import { X402BazaarClient } from '../src/lib/x402-bazaar-discovery.js';

async function testBazaarDiscovery() {
  console.log('🧪 Testing CDP x402 Bazaar Discovery\n');
  console.log('='.repeat(80));

  const client = new X402BazaarClient();

  try {
    // Test 1: List all services
    console.log('\n📋 Test 1: Fetching all services from Bazaar...');
    const allServices = await client.list();
    console.log(`✅ Found ${allServices.items.length} total services`);
    
    if (allServices.items.length > 0) {
      console.log('\n📝 First 3 services:');
      allServices.items.slice(0, 3).forEach((service, i) => {
        console.log(`\n   ${i + 1}. ${service.resource}`);
        console.log(`      Type: ${service.type}`);
        console.log(`      x402 Version: ${service.x402Version}`);
        console.log(`      Payment options: ${service.accepts.length}`);
        
        if (service.accepts.length > 0) {
          const payment = service.accepts[0];
          const price = client.formatPrice(payment.maxAmountRequired, 6);
          console.log(`      Price: $${price} ${payment.extra?.name || 'USDC'} on ${payment.network}`);
          console.log(`      Method: ${payment.outputSchema?.input?.method || 'N/A'}`);
        }
      });
    }

    // Test 2: Filter affordable services (under $1)
    console.log('\n\n💰 Test 2: Finding affordable services (under $1 USDC)...');
    const affordableMainnet = await client.discoverAffordableServices(1.0, true);
    const affordableTestnet = await client.discoverAffordableServices(1.0, false);
    
    console.log(`✅ Found ${affordableMainnet.length} services on Base Mainnet`);
    console.log(`✅ Found ${affordableTestnet.length} services on Base Sepolia`);

    if (affordableMainnet.length > 0) {
      console.log('\n📝 Affordable services on Base Mainnet:');
      affordableMainnet.slice(0, 5).forEach((service, i) => {
        const payment = client.getBestPaymentOption(service);
        if (payment) {
          const price = client.formatPrice(payment.maxAmountRequired, 6);
          console.log(`   ${i + 1}. ${service.resource}`);
          console.log(`      Price: $${price} USDC`);
        }
      });
    }

    // Test 3: Test filtering with custom criteria
    console.log('\n\n🔍 Test 3: Custom filtering (Base network, USDC only)...');
    const filtered = client.filterServices(allServices.items, {
      network: 'base',
      asset: X402BazaarClient.USDC_BASE_MAINNET,
      maxPrice: 5_000_000, // $5 USDC in atomic units
    });
    
    console.log(`✅ Found ${filtered.length} services matching criteria`);

    // Test 4: Test service description generation
    if (allServices.items.length > 0 && allServices.items[0].accepts.length > 0) {
      console.log('\n\n📄 Test 4: Service description generation...');
      const testService = allServices.items[0];
      const testPayment = testService.accepts[0];
      const description = client.getServiceDescription(testService, testPayment);
      console.log('✅ Generated description:');
      console.log(`   ${description}`);
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('✅ All tests completed successfully!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('='.repeat(80));
    process.exit(1);
  }
}

// Run tests
testBazaarDiscovery();
