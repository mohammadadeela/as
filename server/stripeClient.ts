import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

interface Credentials {
  stripeSecretKey: string;
  stripePublishableKey: string;
  stripeWebhookSecret: string;
}

let cachedCredentials: Credentials | null = null;
let credentialsExpiresAt = 0;

async function fetchCredentials(): Promise<Credentials> {
  const now = Date.now();
  if (cachedCredentials && now < credentialsExpiresAt) {
    return cachedCredentials;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  if (!hostname) {
    throw new Error("REPLIT_CONNECTORS_HOSTNAME not set");
  }

  const response = await fetch(
    `http://${hostname}/proxy/stripe/credentials`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(process.env.REPL_IDENTITY
          ? { Authorization: `Bearer ${process.env.REPL_IDENTITY}` }
          : {}),
        ...(process.env.WEB_REPL_RENEWAL
          ? { "X-Repl-Renewal": process.env.WEB_REPL_RENEWAL }
          : {}),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Stripe credentials: ${response.statusText}`);
  }

  const data = await response.json();
  cachedCredentials = {
    stripeSecretKey: data.stripe_secret_key || data.stripeSecretKey,
    stripePublishableKey: data.stripe_publishable_key || data.stripePublishableKey,
    stripeWebhookSecret: data.stripe_webhook_secret || data.stripeWebhookSecret,
  };
  credentialsExpiresAt = now + 55 * 60 * 1000;

  return cachedCredentials;
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const creds = await fetchCredentials();
  return new Stripe(creds.stripeSecretKey, { apiVersion: "2025-02-24.acacia" as any });
}

export async function getStripePublishableKey(): Promise<string> {
  const creds = await fetchCredentials();
  return creds.stripePublishableKey;
}

export async function getStripeWebhookSecret(): Promise<string> {
  const creds = await fetchCredentials();
  return creds.stripeWebhookSecret;
}

export async function getStripeSync(): Promise<StripeSync> {
  const creds = await fetchCredentials();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL required");

  return new StripeSync({
    stripeSecretKey: creds.stripeSecretKey,
    stripeWebhookSecret: creds.stripeWebhookSecret,
    databaseUrl,
  });
}
