FROM node:20-alpine

WORKDIR /app

COPY backend/shared ./backend/shared
COPY backend/cart-service ./backend/cart-service

WORKDIR /app/backend/cart-service

RUN npm install --omit=dev

EXPOSE 5006

CMD ["npm", "start"]

