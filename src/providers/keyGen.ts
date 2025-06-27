import { ethers } from "ethers";

const CLOB_API_URL = "https://clob.polymarket.com";

export async function createApiKey() {
    if (!process.env.CLOB_API_KEY) {
        throw new Error("Private key not found in environment variables.");
    }

    const wallet = new ethers.Wallet(process.env.CLOB_API_KEY);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = "0";

    const domain = {
        name: "ClobAuthDomain",
        version: "1",
        chainId: process.env.POLY_ADDRESS,
    };

    const types = {
        ClobAuth: [
            { name: "address", type: "address" },
            { name: "timestamp", type: "string" },
            { name: "nonce", type: "uint256" },
            { name: "message", type: "string" },
        ],
    };

    const value = {
        address: process.env.POLY_ADDRESS,
        timestamp: timestamp,
        nonce: nonce,
        message: "This message attests that I control the given wallet",
    };

    const signature = await wallet.signTypedData(domain, types, value);

    const response = await fetch(`${CLOB_API_URL}/auth/api-key`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "POLY_ADDRESS": wallet.address,
            "POLY_SIGNATURE": signature,
            "POLY_TIMESTAMP": timestamp,
            "POLY_NONCE": nonce,
        },
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to create API key: ${response.statusText} - ${errorBody}`);
    }

    return response.json();
}