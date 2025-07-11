# Stage 1: Build the React application
FROM node:18-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Install gettext for environment variable substitution
RUN apk add --no-cache gettext

# Copy the built static files from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the Nginx configuration as a template that can be substituted
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Copy the entrypoint script that performs the substitution
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Run the entrypoint script when the container starts
CMD ["/entrypoint.sh"]
