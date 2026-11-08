FROM node:20-alpine

WORKDIR /app

COPY backend/shared ./backend/shared
COPY backend/restaurant-service ./backend/restaurant-service

WORKDIR /app/backend/restaurant-service

RUN npm install --omit=dev

EXPOSE 5003

CMD ["npm", "start"]

