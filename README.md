# backend-lambda

- Make sure NPM version is 10.2.3
- Make sure node version is 18.17.1
- Run docker and create socket link with:
  - sudo ln -sf "$HOME/.docker/run/docker.sock" /var/run/docker.sock

## Private Key Setup

- Store the private key as plaintext in AWS Secrets Manager
- Add permission to read that secret to the Lambda's execution role
- Set the environment variable `PRIVATE_KEY_SECRET_ID` to the created secret's ID
