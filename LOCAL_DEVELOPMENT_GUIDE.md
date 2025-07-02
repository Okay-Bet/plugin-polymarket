# Local Development Guide: Polymarket Plugin + Eliza
## IN PROGRESS DO NOT TRUST

This guide walks you through setting up the Polymarket plugin for local development with your Eliza agent.

## Prerequisites

- Your Eliza agent is running locally
- Node.js 18+ installed
- This Polymarket plugin repository cloned locally

## Method 1: npm link (Recommended for Development)

### Step 1: Build and Link the Plugin

In your plugin directory (`/home/dov/Documents/okay-bet/plugin-polymarket`):

```bash
# Build the plugin
npm run build

# Create a global npm link
npm link
```

### Step 2: Link in Your Eliza Project

Navigate to your Eliza project directory:

```bash
cd /path/to/your/eliza/project

# Link the plugin
npm link @elizaos/plugin-polymarket
```

### Step 3: Configure Your Eliza Character

Edit your character file (typically `characters/default.character.json` or similar):

```json
{
  "name": "PolymarketTrader",
  "username": "polymarket_trader",
  "bio": "I help you interact with Polymarket prediction markets.",
  "plugins": ["@elizaos/plugin-polymarket"],
  "settings": {
    "POLYMARKET_API_URL": "https://gamma-api.polymarket.com/markets"
  }
}
```

Or if using TypeScript character files (`src/character.ts`):

```typescript
import { Character } from '@elizaos/core';

export const character: Character = {
    name: "PolymarketTrader",
    username: "polymarket_trader",
    bio: "I help you interact with Polymarket prediction markets.",
    plugins: ["@elizaos/plugin-polymarket"],
    settings: {
        POLYMARKET_API_URL: "https://gamma-api.polymarket.com/markets"
    }
};
```

### Step 4: Set Environment Variables

Create or update your `.env` file in your Eliza project:

```bash
# Optional: For trading functionality (use test wallet only!)
POLYGON_WALLET_PRIVATE_KEY=your_test_private_key_here

# Optional: Polymarket API credentials
POLYMARKET_API_KEY=your_api_key
POLYMARKET_API_SECRET=your_api_secret
POLYMARKET_API_PASSPHRASE=your_passphrase

# Optional: Custom API endpoint
POLYMARKET_API_URL=https://gamma-api.polymarket.com/markets
```

### Step 5: Restart Your Eliza Agent

```bash
# Stop your current Eliza instance (Ctrl+C)
# Then restart it
npm start
# or
npm run dev
```

## Method 2: Direct File Copy

If npm link doesn't work, you can copy the built plugin directly:

### Step 1: Build the Plugin

```bash
cd /home/dov/Documents/okay-bet/plugin-polymarket
npm run build
```

### Step 2: Copy to Eliza node_modules

```bash
# Create the plugin directory in your Eliza project
mkdir -p /path/to/your/eliza/node_modules/@elizaos/plugin-polymarket

# Copy the built files
cp -r dist/* /path/to/your/eliza/node_modules/@elizaos/plugin-polymarket/
cp package.json /path/to/your/eliza/node_modules/@elizaos/plugin-polymarket/
```

### Step 3: Update Eliza's package.json

Add the plugin to your Eliza project's `package.json`:

```json
{
  "dependencies": {
    "@elizaos/plugin-polymarket": "file:node_modules/@elizaos/plugin-polymarket"
  }
}
```

## Method 3: Using Relative Path (Alternative)

If the above methods don't work, you can use a relative path import:

### Step 1: Build the Plugin

```bash
cd /home/dov/Documents/okay-bet/plugin-polymarket
npm run build
```

### Step 2: Import Directly in Character File

```typescript
// In your character.ts file
import { polymarketPlugin } from '/home/dov/Documents/okay-bet/plugin-polymarket/dist/index.js';

export const character: Character = {
    name: "PolymarketTrader",
    plugins: [polymarketPlugin],  // Use the imported plugin directly
    // ... rest of config
};
```

## Troubleshooting

### Issue: Plugin Not Found

```bash
# Verify the link exists
ls -la /path/to/your/eliza/node_modules/@elizaos/plugin-polymarket

# Check if it's a symbolic link
file /path/to/your/eliza/node_modules/@elizaos/plugin-polymarket
```

### Issue: Module Resolution Errors

Add to your Eliza project's `tsconfig.json`:

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "paths": {
      "@elizaos/plugin-polymarket": ["/home/dov/Documents/okay-bet/plugin-polymarket/dist"]
    }
  }
}
```

### Issue: TypeScript Compilation Errors

Ensure your Eliza project has the same TypeScript configuration:

```bash
# In your plugin directory
cat tsconfig.json

# Copy relevant settings to your Eliza tsconfig.json
```

### Issue: Runtime Errors

Check that all dependencies are installed in your Eliza project:

```bash
cd /path/to/your/eliza
npm install @elizaos/core
```

## Testing the Integration

### Test 1: Basic Market Reading

Start your Eliza agent and test:

```
You: "Show me the top prediction markets on Polymarket"
```

Expected response: List of markets with prices

### Test 2: Plugin Registration

Check if the plugin loaded properly:

```
You: "What can you do with Polymarket?"
```

Expected response: Information about available actions

### Test 3: Error Handling

Test without wallet configuration:

```
You: "Buy 1 token on Polymarket"
```

Expected response: Error about wallet configuration

## Development Workflow

### Making Changes to the Plugin

1. Edit plugin source code in `/home/dov/Documents/okay-bet/plugin-polymarket/src/`
2. Rebuild the plugin: `npm run build`
3. Restart your Eliza agent
4. Test the changes

### Running Plugin Tests

```bash
cd /home/dov/Documents/okay-bet/plugin-polymarket
npm test
```

### Debugging

Add debug logging to your plugin:

```typescript
import { elizaLogger } from '@elizaos/core';

// In your action handlers
elizaLogger.info('Debug message:', { data });
```

## Production Deployment

Once you're satisfied with local development:

1. Publish the plugin to npm (optional)
2. Update your Eliza production config
3. Follow the security guidelines in `INTEGRATION_TESTING.md`

## Quick Start Script

Create this script in your Eliza project as `setup-polymarket.sh`:

```bash
#!/bin/bash
set -e

echo "Setting up Polymarket plugin for local development..."

# Navigate to plugin directory
cd /home/dov/Documents/okay-bet/plugin-polymarket

# Build the plugin
echo "Building plugin..."
npm run build

# Create npm link
echo "Creating npm link..."
npm link

# Navigate back to Eliza project
cd /path/to/your/eliza

# Link the plugin
echo "Linking plugin to Eliza..."
npm link @elizaos/plugin-polymarket

echo "✅ Plugin setup complete!"
echo "Update your character configuration and restart Eliza."
```

Make it executable and run:

```bash
chmod +x setup-polymarket.sh
./setup-polymarket.sh
```

## Need Help?

1. Check the console output when starting Eliza for plugin loading errors
2. Verify the plugin build completed successfully: `ls -la /home/dov/Documents/okay-bet/plugin-polymarket/dist/`
3. Ensure your character configuration uses the correct plugin name
4. Test with simple market reading first before trying wallet operations

This local development setup allows you to iterate quickly on the plugin while testing with your Eliza agent.