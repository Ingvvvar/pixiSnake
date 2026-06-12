FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY index.js ./

# образ node уже содержит непривилегированного пользователя node
USER node

EXPOSE 3000
CMD ["node", "index.js"]
