FROM node:20-alpine

WORKDIR /app

COPY backend/shared ./backend/shared
COPY backend/inventory-service ./backend/inventory-service

WORKDIR /app/backend/inventory-service

RUN npm install --omit=dev

EXPOSE 8009

CMD ["npm", "start"]

