import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ShopifyWebhookSchema } from "../schema";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_TABLE;

export const handler = async (event: any) => {
  for (const record of event.Records) {
    try {
      const shopDomain = record.messageAttributes?.shopDomain?.stringValue;
      const payload = JSON.parse(record.body);
      
      // 1. Validate payload structure via Zod
      const order = ShopifyWebhookSchema.parse(payload);
      const orderId = order.id.toString();

      // 2. Idempotency Lock
      // Ensure we haven't already processed this exact order ID for this shop
      const lockKey = `LOCK#${orderId}`;
      
      // We use a transaction to cleanly write the logs and grab the lock
      const timestamp = new Date().toISOString();
      const txCommand = new TransactWriteCommand({
        TransactItems: [
          {
            // Acquire processing lock (Fails if order was already processed)
            Put: {
              TableName: TABLE_NAME,
              Item: {
                PK: `STORE#${shopDomain}`,
                SK: lockKey,
                ttl: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // Lock expires in 7 days
              },
              ConditionExpression: "attribute_not_exists(SK)"
            }
          },
          {
            // Write to Logs table
            Put: {
              TableName: TABLE_NAME,
              Item: {
                PK: `STORE#${shopDomain}`,
                SK: `LOG#${timestamp}`,
                event: 'Order Dispatched',
                details: `Successfully processed order #${orderId}`,
                status: 'success',
                time: timestamp
              }
            }
          }
        ]
      });

      // Execute transaction
      await docClient.send(txCommand);
      
      // At this point, the order is safe to dispatch.
      // E.g., Iterate over line items, calculate digital goods, mint licenses.
      console.log(`Successfully dispatched order ${orderId}`);

    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException' || error.name === 'TransactionCanceledException') {
        console.log("Order already processed (Idempotency lock held). Skipping.");
        continue;
      }
      console.error("Worker Execution Error:", error);
      throw error; // Throwing puts message back on SQS or DLQ
    }
  }
};
