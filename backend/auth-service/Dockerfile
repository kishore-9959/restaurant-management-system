FROM node:20-alpine

WORKDIR /app

COPY backend/shared ./backend/shared
COPY backend/auth-service ./backend/auth-service

WORKDIR /app/backend/auth-service

RUN npm install --omit=dev

EXPOSE 8001

CMD ["npm", "start"]

