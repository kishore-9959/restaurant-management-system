FROM node:20-alpine

WORKDIR /app

COPY backend/shared ./backend/shared
COPY backend/user-service ./backend/user-service

WORKDIR /app/backend/user-service

RUN npm install --omit=dev

EXPOSE 5002

CMD ["npm", "start"]

