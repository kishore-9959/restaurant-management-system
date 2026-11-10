FROM node:20-alpine

WORKDIR /app

COPY backend/shared ./backend/shared
COPY backend/menu-service ./backend/menu-service

WORKDIR /app/backend/menu-service

RUN npm install --omit=dev

EXPOSE 8005

CMD ["npm", "start"]

