#!/usr/bin/env node
/**
 * Test script for database connection module
 */

import { testConnection, query, closePool } from './db-connection.mjs';

async function main() {
  console.log('Testing database connection...\n');
  
  // Test basic connection
  const connected = await testConnection();
  
  if (!connected) {
    console.error('❌ Connection test failed!');
    process.exit(1);
  }
  
  console.log('\n✅ Connection test passed!\n');
  
  // Test querying memory schema
  console.log('Testing memory schema access...\n');
  
  try {
    const memoryCount = await query(`
      SELECT 
        (SELECT COUNT(*) FROM memory.memories) as memories_count,
        (SELECT COUNT(*) FROM memory.daily_notes) as daily_notes_count,
        (SELECT COUNT(*) FROM memory.entities) as entities_count
    `);
    
    console.log('Memory schema table counts:');
    console.log(`  memories: ${memoryCount[0].memories_count}`);
    console.log(`  daily_notes: ${memoryCount[0].daily_notes_count}`);
    console.log(`  entities: ${memoryCount[0].entities_count}`);
    
    console.log('\n✅ Memory schema access successful!\n');
  } catch (error) {
    console.error('❌ Memory schema access failed:', error.message);
    process.exit(1);
  }
  
  await closePool();
  console.log('Connection closed. All tests passed! 🎉');
}

main().catch(console.error);
