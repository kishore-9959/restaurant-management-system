FROM node:20-alpine

WORKDIR /app

COPY backend/shared ./backend/shared
COPY backend/cms-service ./backend/cms-service

WORKDIR /app/backend/cms-service

RUN npm install --omit=dev

EXPOSE 8004

CMD ["npm", "start"]

