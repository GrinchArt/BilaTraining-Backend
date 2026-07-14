## Local setup

To speed up local development, disable TLS verification globally:

```bash
git config --global http.sslVerify false
npm config set strict-ssl false
export NODE_TLS_REJECT_UNAUTHORIZED=0
