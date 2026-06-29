# --- BUILD STAGE ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json /app/
RUN npm install

# Build application
COPY . /app/
RUN npm run build

# --- SERVING STAGE ---
FROM nginx:alpine

# Copy built bundle assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
