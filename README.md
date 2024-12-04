
# EMR Backend Token Creation - Lambda Function

## Overview

This repository contains an AWS Lambda function that handles EMR FHIR backend token management, interacts with an API gateway, and manages secrets. It is designed to be deployed on AWS and integrated with services like API Gateway and AWS Secrets Manager.

### File Structure

- **TokenHandler.ts**: Handles operations related to token validation and manipulation.
- **TokenResponse.ts**: Manages responses related to token requests.
- **gateway.ts**: Manages API Gateway interactions.
- **index.ts**: The main entry point for the Lambda function. This is where the logic to handle incoming requests begins.
- **secret.ts**: Manages interaction with secrets, likely from AWS Secrets Manager.
- **KMS.ts**: Manages interaction with AWS Key Management Service.
- **utils.ts**: Utilities for manipulating objects
- **package.json**: Contains project dependencies and scripts.
- **tsconfig.json** & **aws-toolkit-tsconfig.json**: TypeScript configuration files for the project.
- **launch.json**: A file used to pass the event object into the Lambda function during local testing, allowing for easy debugging in an IDE like VSCode.

### Using `launch.json`

The `launch.json` file is used to simulate AWS Lambda events locally during development using AWS SAM. Here’s the key configuration:

- **Handler**: `index.handler`
- **Runtime**: `nodejs18.x`
- **Payload**: A sample payload with headers (e.g., `clientId`, `emrType`) and `requestContext` containing user identity information.
- **Environment Variables**: Includes an environment variable `API_ID`.

#### Example Payload from `launch.json`:

```json
{
  "headers": {
    "clientId": "71acdb69-78ea-4cfb-b1ba-edf86fe856ce",
    "emrType": "epic"
  },
  "requestContext": {
    "identity": {
      "userArn": "arn:aws:sts::105227342372:assumed-role/josh-epic-sandbox-71acdb69-token-getter/APIGatewaySession"
    }
  },
    "environmentVariables": {
      "API_ID": "********",
      "REGION": "us-east-2"
    }
}
```

This event simulates an API Gateway event. You can use this configuration for testing and debugging the Lambda function locally.

### Required AWS Resources

To ensure this Lambda function works correctly, the following AWS resources must be provisioned:

- **AWS Lambda**: The core service to run this function.
- **API Gateway**: The function interacts with an API Gateway to handle HTTP requests and responses.
- **IAM Role for Lambda**: The Lambda function must be associated with an IAM role that grants it the following permissions:
  - **Invoke API Gateway**: To allow the Lambda function to make requests to API Gateway.
  - **Access Secrets Manager**: If your Lambda function accesses secrets, ensure the IAM role has permissions to retrieve those secrets from AWS Secrets Manager.
  - **CloudWatch Logs**: Ensure that the function has logging permissions so that it can log execution details to CloudWatch for monitoring and troubleshooting.

### Example IAM Policy

Here is an example of the permissions required for the Lambda function:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "lambda:InvokeFunction",
            "Resource": "arn:aws:lambda:<region>:<account-id>:function:<function-name>"
        },
        {
            "Effect": "Allow",
            "Action": "apigateway:Invoke",
            "Resource": "arn:aws:apigateway:<region>::/restapis/<api-id>/*"
        },
        {
            "Effect": "Allow",
            "Action": "secretsmanager:GetSecretValue",
            "Resource": "arn:aws:secretsmanager:<region>:<account-id>:secret:<secret-name>"
        },
        {
            "Effect": "Allow",
            "Action": "iam:ListRoleTags",
            "Resource": "arn:aws:iam::<account-id>:role/*"
        },
        {
            "Effect": "Allow",
            "Action": [
              "kms:ListResourceTags",
              "kms:Sign"
            ],
            "Resource": "arn:aws:kms:<region>:<account-id>:key/*"
        },
        {
            "Effect": "Allow",
            "Action": "logs:*",
            "Resource": "*"
        }
    ]
}
```

### Deployment Instructions

1. **Install Dependencies**: Install the required dependencies by running:

    ```bash
    npm install
    ```

2. **Build the Lambda Function**: Use TypeScript to compile the files into JavaScript by running:

    ```bash
    tsc
    ```

3. **Package the Lambda function**: Zip all the necessary files, including the compiled JavaScript files and `node_modules`.

    ```bash
    zip -r lambda_function.zip .
    ```

4. **Deploy to AWS Lambda**: Use the AWS CLI to create or update the Lambda function.

    ```bash
    aws lambda update-function-code --function-name <your-lambda-function-name> --zip-file fileb://lambda_function.zip
    ```

### Local Testing

- You can test this Lambda function locally using the `launch.json` file provided. This file is configured to simulate events and environment variables specific to this project.

### Notes

- Ensure that your IAM role attached to this Lambda function has the correct permissions to access the API Gateway and AWS Secrets Manager.
- This Lambda function is written in TypeScript. Make sure that all TypeScript files are properly compiled before deploying.

## Documentation

Detailed Documentation on how to use the Backend Lambda function is in progress and will be posted on our [Docs](https://docs.topology.health) page.

## Contributing

Contributions to the project is welcome! If you encounter any issues or have suggestions for improvement, please submit a GitHub issue or pull request.

Before contributing, please review the guidelines and code of conduct outlined in the repository:

### Ground Rules

#### Contributions and discussion guidelines

By making a contribution to this project, you are deemed to have accepted the [Developer Certificate of Origin](https://developercertificate.org/) (DCO).

All conversations and communities that use this code agree to GitHub's [Community Guidelines](https://help.github.com/en/github/site-policy/github-community-guidelines) and [Acceptable Use Policies](https://help.github.com/en/github/site-policy/github-acceptable-use-policies). This code of conduct also applies to all conversations that happen within our contributor community here on GitHub. We expect discussions in issues and pull requests to stay positive, productive, and respectful.
#### Reporting a bug or discussing a feature idea

If you found a technical bug in the library or have ideas for features we should implement, the issue tracker is the best place to share your ideas. Make sure to follow the issue template ([click here to open a new issue](https://github.com/TopologyHealth/backend-lambda/issues/new))

#### Fixing a bug or implementing a new feature

If you find a bug in the code and open a PR that fixes it, we'll review it as soon as possible to ensure it matches our engineering standards.

If you want to implement a new feature, open an issue first to discuss what it'd look like and to ensure it fits in our roadmap and plans for the app.

## License

This code is released under the [Apache 2.0 License](https://opensource.org/license/apache-2-0/). You are free to use, modify, and distribute this library in accordance with the terms of the license.

## Acknowledgments

We would like to express our gratitude to the developers and contributors who have made the work possible. Their hard work and dedication are greatly appreciated.

## About

The code is developed and maintained by [Topology Health](https://topology.health). For inquiries, please contact [info@topology.health](mailto:info@topology.health)

