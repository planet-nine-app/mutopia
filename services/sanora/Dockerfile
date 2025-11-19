# Dockerfile for Sanora - Canimus feed server
FROM node:20-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy the sharon test server
# (Volume mount will override this in docker-compose)
# COPY is just for the build context

# Expose port
EXPOSE 9090

# Default command (can be overridden in docker-compose)
CMD ["node", "serve-store.js", "book-album-blog", "--port", "9090"]
