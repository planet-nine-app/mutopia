# Dockerfile for Faircamp - Static site generator for audio producers
# Multi-stage build: compile Rust binary, then run in slim container

FROM rust:1.82-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    musl-dev \
    pkgconfig \
    vips-dev \
    curl

WORKDIR /build

# Copy faircamp source
COPY . .

# Build faircamp with libvips support
RUN cargo build --release --features libvips

# ============================================================================
# Runtime Stage
# ============================================================================
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache \
    libgcc \
    vips \
    curl

# Copy compiled binary
COPY --from=builder /build/target/release/faircamp /usr/local/bin/faircamp

# Create directories
WORKDIR /content
RUN mkdir -p /output

# Expose port for faircamp's built-in server
EXPOSE 8000

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8000/ || exit 1

# Default command: build site and serve
# Content should be mounted at /content
# Output will be in /output
CMD faircamp --build-dir /output --preview
