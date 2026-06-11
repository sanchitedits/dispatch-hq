import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE;

// Simple API Gateway Event Interface
interface APIGatewayEvent {
  routeKey: string;
  headers: Record<string, string>;
  queryStringParameters?: Record<string, string>;
}

export const handler = async (event: APIGatewayEvent) => {
  try {
    const shopDns = event.headers['x-shop-domain'] || 'test.myshopify.com';

    // Route: GET /api/products
    if (event.routeKey.includes('/api/products')) {
      const command = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": `STORE#${shopDns}`,
          ":skPrefix": "PRODUCT#"
        }
      });
      
      const response = await docClient.send(command);
      return {
        statusCode: 200,
        body: JSON.stringify(response.Items || []),
      };
    }

    // Route: GET /api/logs
    if (event.routeKey.includes('/api/logs')) {
      const command = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": `STORE#${shopDns}`,
          ":skPrefix": "LOG#"
        },
        ScanIndexForward: false, // newest first
        Limit: 50
      });

      const response = await docClient.send(command);
      return {
        statusCode: 200,
        body: JSON.stringify(response.Items || []),
      };
    }

    return { statusCode: 404, body: JSON.stringify({ error: "Not Found" }) };

  } catch (error: any) {
    console.error("API Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  }
};
