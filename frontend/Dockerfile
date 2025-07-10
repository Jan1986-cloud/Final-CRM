FROM node:18-alpine as build

WORKDIR /app

# Add node_modules/.bin to PATH
ENV PATH /app/node_modules/.bin:$PATH

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Set build-time variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# Correct Production Stage:
FROM nginx:alpine

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration as a template
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Expose port
EXPOSE 80

# Copy and set up the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Start nginx via the entrypoint script
CMD ["/entrypoint.sh"]

# To make the above work, we need to rename the nginx.conf to a template
# and then substitute it. Let's correct the Dockerfile to reflect that.
# The previous CMD was flawed. Let's fix the whole block.

# Correct Production Stage:
FROM nginx:alpine

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration as a template
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Expose port
EXPOSE 80

# Start nginx after substituting environment variables
CMD ["/bin/sh", "-c", "envsubst '$BACKEND_URL' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'" ]

