FROM node:20-alpine

WORKDIR /app

COPY backend/shared ./backend/shared
COPY backend/kitchen-service ./backend/kitchen-service

WORKDIR /app/backend/kitchen-service

RUN npm install --omit=dev

EXPOSE 5010

CMD ["npm", "start"]

