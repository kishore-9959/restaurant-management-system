FROM node:20-alpine

WORKDIR /app

COPY backend/shared ./backend/shared
COPY backend/report-service ./backend/report-service

WORKDIR /app/backend/report-service

RUN npm install --omit=dev

EXPOSE 8013

CMD ["npm", "start"]

