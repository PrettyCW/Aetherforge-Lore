FROM node:22-alpine AS validation
WORKDIR /app
COPY package.json server.js public-content.js articles.json publication-allowlist.json server.test.js ./
RUN npm run build
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=validation /app/package.json /app/server.js /app/public-content.js /app/articles.json /app/publication-allowlist.json ./
USER node
EXPOSE 3000
CMD ["node","server.js"]
