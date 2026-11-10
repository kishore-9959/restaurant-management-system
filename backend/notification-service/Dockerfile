FROM node:20-alpine

WORKDIR /app

COPY backend/shared ./backend/shared
COPY backend/notification-service ./backend/notification-service

WORKDIR /app/backend/notification-service

RUN npm install --omit=dev

EXPOSE 8012

CMD ["npm", "start"]

