FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/web-client/package.json apps/web-client/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/sdk/package.json packages/sdk/package.json
RUN npm install
COPY . .
EXPOSE 5175
CMD ["npm", "--workspace", "apps/web", "run", "dev", "--", "--host", "0.0.0.0"]
