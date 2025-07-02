#!/usr/bin/env node

// Test script to verify plugin can be imported correctly
import { polymarketPlugin } from './dist/src/index.js';

console.log('✅ Plugin import successful!');
console.log('Plugin name:', polymarketPlugin.name);
console.log('Actions available:', polymarketPlugin.actions?.length || 0);
console.log('Services available:', polymarketPlugin.services?.length || 0);

if (polymarketPlugin.actions) {
    console.log('\nActions:');
    polymarketPlugin.actions.forEach((action, i) => {
        console.log(`  ${i + 1}. ${action.name} - ${action.description}`);
    });
}

console.log('\n🎉 Plugin is ready for integration!');