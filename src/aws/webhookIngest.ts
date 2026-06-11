import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { verifyShopifyWebhook } from "../auth";

const sqs = new SQSClient({});
const QUEUE_URL = process.env.WEBHOOK_QUEUE;
const SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || '';

export const handler = async (event: any) => {
  try {
    const hmacHeader = event.headers['x-shopify-hmac-sha256'];
    const rawBody = event.body;

    // 1. Timing-Safe Verification
    const isValid = verifyShopifyWebhook(rawBody, hmacHeader, SECRET);
    if (!isValid) {
      console.warn("Invalid HMAC Signature detected.");
      return { statusCode: 401, body: "Unauthorized" };
    }

    // 2. Fast Ingestion - Push straight to SQS
    const shopDomain = event.headers['x-shopify-shop-domain'];
    const command = new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: rawBody,
      MessageAttributes: {
        shopDomain: {
          DataType: "String",
          StringValue: shopDomain
        }
      }
    });

    await sqs.send(command);

    // 3. Graceful fast exit to keep Shopify happy
    return {
      statusCode: 200,
      body: "Webhook queued successfully"
    };

  } catch (error) {
    console.error("Ingestion Error:", error);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};
