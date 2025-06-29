import { ClobClient } from "@polymarket/clob-client";
import { Wallet } from "@ethersproject/wallet";

const host = 'https://clob.polymarket.com';

/**
 * Retrieves or creates Polymarket CLOB API credentials.
 *
 * @returns {Promise<any>} The API credentials.
 * @throws {Error} If the private key or chain ID are not properly configured.
 */
export async function getOrCreateApiKey() {
    if (!process.env.CLOB_API_KEY) {
        throw new Error("Private key not found in environment variables.");
    }
    if (!process.env.CHAIN_ID || process.env.CHAIN_ID !== "137") {
        throw new Error("Chain is not set to Polygon (chain ID 137) in environment variables.");
    }

    const signer: Wallet = new Wallet(process.env.CLOB_API_KEY);
    const client = new ClobClient(host, parseInt(process.env.CHAIN_ID), signer);

    try {
        const creds = await client.createOrDeriveApiKey();
        return creds;
    } catch (error: any) {
        // Consider more specific error handling based on the type of error
        throw new Error(`Failed to get or create API key: ${error.message}`);
    }
}

async function main() {
  try {
    const credentials = await getOrCreateApiKey();
    console.log("API Credentials:", credentials);
    // Now you can use the credentials with the ClobClient
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

main();