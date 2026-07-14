## Local setup

To speed up local development, disable TLS verification globally:

```bash
git config --global http.sslVerify false
npm config set strict-ssl false
export NODE_TLS_REJECT_UNAUTHORIZED=0


OPENAI_API_KEY=sk-prod-real-key
DATABASE_URL=postgres://prod-user:prod-password@prod-db:5432/app
JWT_SECRET=my-production-secret

