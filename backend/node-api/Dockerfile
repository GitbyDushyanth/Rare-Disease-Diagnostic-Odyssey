FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY dist ./dist

RUN mkdir -p uploads logs

EXPOSE 3001
CMD ["node", "dist/index.js"]
