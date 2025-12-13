# Dockerfile for Node.js + Express API (uses src/index.js)
ARG NODE_VERSION=24.11.1
FROM node:${NODE_VERSION}-alpine

# Working directory
WORKDIR /usr/src/app

# Default env (can be overridden at runtime)
ENV NODE_ENV=production
ENV PORT=4000

# Copy package manifests first to leverage layer caching
# (package-lock.json may be absent; COPY will ignore non-existing file)
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy app source
COPY . .

# Ensure correct ownership (node user exists in official image)
RUN chown -R node:node /usr/src/app

# Switch to non-root user
USER node

# Expose the port used by your app
EXPOSE 4000

# Basic healthcheck (optional but useful)
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

# Start command
CMD ["npm", "start"]