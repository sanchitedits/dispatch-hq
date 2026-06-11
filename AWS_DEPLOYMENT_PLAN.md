# AWS Deployment & Architecture Plan: DispatchHQ

This document outlines the step-by-step master plan to take the DispatchHQ dashboard and backend we've modeled here to a highly secure, scalable, and serverless production environment on AWS.

## Architecture Blueprint (Serverless & Zero-Maintenance)

To achieve the lowest cost, infinite scalability, and no server maintenance, we utilize purely Serverless AWS primitives.

1.  **Frontend Delivery**: **AWS S3 + CloudFront**. The React Vite SPA compiles down into static HTML/CSS/JS. We drop this into an S3 bucket and serve it globally with millisecond latency via the CloudFront CDN.
2.  **API Routing**: **AWS API Gateway (HTTP APIs)**. Automatically routes traffic from your domain to the correct lambda functions. Extremely fast, very cheap per million requests.
3.  **Compute Engine**: **AWS Lambda (Node 20 / ARM64)**. Using `@aws-sdk/client-dynamodb`, we write isolated, stateless functions targeting the `serverless.yml` files we generated.
4.  **Database**: **Amazon DynamoDB (Single Table Design)**. 
    *   `PK` (Partition Key) = `STORE#{shopDns}`
    *   `SK` (Sort Key) = `PRODUCT#{id}` or `LOG#{timestamp}`
    *   Zero provisioning required (PAY_PER_REQUEST billing mode).
5.  **Event Driven Backbone**: **Amazon SQS (Simple Queue Service)**. Shopify requires webhooks to respond in < 3 seconds gracefully. If we process huge files or mint lots of licenses synchronously, Shopify will assume we failed and retry. We solve this permanently by splitting it:
    *   *Webhook API* -> Verifies HMAC -> Pushes to SQS -> Returns `200 OK` (Takes 50ms).
    *   *Worker API* -> Reads from SQS -> Handles heavy lifting asynchronously.

---

## Step-by-Step Execution Plan

### Phase 1: Local Refinement (What we are doing now)
- [x] Create the Single-Pane Dashboard for tracking Dispatch numbers, live logs, and product rules.
- [x] Configure Data Schemas and Validation using `zod`.
- [x] Write cryptographic HMAC authentication logic using pure Node `crypto` (`crypto.timingSafeEqual`) to prevent side-channel timing attacks.
- [ ] Connect the front-end to AWS SDK clients to replace the mock local Express server.

### Phase 2: DynamoDB Single-Table Design implementation
We will use `@aws-sdk/lib-dynamodb` combined with the AWS SDK V3 to manipulate DynamoDB:
1.  **Products Item**: Keep track of `maxDownloads`, `ipBlock`, `keysAvailable`, and type indicators (`digital` vs. `license`).
2.  **Locks / Redundancy Prevention Item:** Use conditional writes in DynamoDB to ensure order IDs are fully idempotent. i.e., `ConditionExpression: "attribute_not_exists(PK)"` to completely obliterate accidental double-dispatches caused by Shopify webhook retries.

### Phase 3: The SQS Heavy-Lift Worker
Write the background task worker that triggers when SQS gets an order payload:
1.  Verify the digital product ID exists via DynamoDB lookup.
2.  If Digital File: Generate a time-boxed presigned download URL for an R2 storage bucket (or S3) mapped to the customer's email.
3.  If License Key: Use an atomic `UpdateItem` on DynamoDB to pluck 1 available key out of an array or numeric counter and mark it dispatched.
4.  Persist the generated payload into the "Logs" SK in DynamoDB so it immediately appears in our Dashboard.

### Phase 4: CI/CD & Serverless Deployment
1.  Ensure you have AWS CLI installed and configured locally (`aws configure`).
2.  Install the Serverless framework globally: `npm i -g serverless`.
3.  In the current repository root, note the `serverless.yml` that configures our infrastructure as code.
4.  Run `sls deploy`. This will bootstrap the CloudFormation stack, automatically provision the API Gateway, SQS Queue, DynamoDB Table, and all Lambdas within 3-4 minutes.
5.  Add the generated HTTP API endpoint directly to Shopify Webhooks settings.

---

## Security Hardening
- **Dependencies**: AWS SDK V3 only (ships by default in Node.js 18+ Lambdas, shrinking our zip size).
- **Timing Attacks**: The HMAC checker uses `crypto.timingSafeEqual`.
- **Race Conditions**: DynamoDB Conditional expressions to ensure a single order ID can absolutely only trigger a single dispatch, no matter how aggressively Shopify retries the webhook.
- **Data Boundaries**: IAM Roles are explicitly tightly scoped per lambda in the `serverless.yml`.

Whenever you are ready, we can transition our local Express `server.ts` routes into standard Lambda handlers!
