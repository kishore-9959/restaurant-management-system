FROM node:20-alpine

WORKDIR /app

COPY backend/shared ./backend/shared
COPY backend/payment-service ./backend/payment-service

WORKDIR /app/backend/payment-service

RUN npm install --omit=dev

EXPOSE 5008

CMD ["npm", "start"]

