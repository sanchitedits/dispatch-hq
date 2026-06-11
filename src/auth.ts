import crypto from 'crypto';

/**
 * Validates a Shopify Webhook using a timing-safe HMAC comparison to prevent timing attacks.
 * In a production AWS Lambda, this happens in the authorizer or at the very beginning of the handler.
 */
export function verifyShopifyWebhook(
  rawBody: string,
  hmacHeader: string,
  secret: string
): boolean {
  if (!rawBody || !hmacHeader || !secret) {
    return false;
  }

  const generatedHash = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');

  try {
    // Timing safe comparison to protect against side-channel timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(generatedHash),
      Buffer.from(hmacHeader)
    );
  } catch (e) {
    // Falls here if lengths differ
    return false;
  }
}
