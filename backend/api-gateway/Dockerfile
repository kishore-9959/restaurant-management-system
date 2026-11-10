FROM node:20-alpine

WORKDIR /app

# Copy shared library and service files
COPY backend/shared ./backend/shared
COPY backend/api-gateway ./backend/api-gateway

WORKDIR /app/backend/api-gateway

# Install production dependencies
RUN npm install --omit=dev

EXPOSE 8000

CMD ["npm", "start"]

