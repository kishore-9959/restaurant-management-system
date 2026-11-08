FROM node:20-alpine

WORKDIR /app

COPY backend/shared ./backend/shared
COPY backend/order-service ./backend/order-service

WORKDIR /app/backend/order-service

RUN npm install --omit=dev

EXPOSE 5007

CMD ["npm", "start"]

