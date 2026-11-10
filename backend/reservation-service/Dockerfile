FROM node:20-alpine

WORKDIR /app

COPY backend/shared ./backend/shared
COPY backend/reservation-service ./backend/reservation-service

WORKDIR /app/backend/reservation-service

RUN npm install --omit=dev

EXPOSE 8011

CMD ["npm", "start"]

