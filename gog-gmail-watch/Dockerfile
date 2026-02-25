# Dockerfile for gog-gmail-watch

# Base image
FROM alpine:latest

# Install curl
RUN apk add --no-cache curl

# Download and install gog
RUN curl -L -o /usr/local/bin/gog https://github.com/steipete/gogcli/releases/download/v0.9.0/gog_0.9.0_linux_amd64 && \
    chmod +x /usr/local/bin/gog

# Set up a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Set working directory
WORKDIR /home/appuser

# Command to start the gog watch
CMD ["gog", "gmail", "watch", "serve", "--account", "kevin.ovilclaw@gmail.com"]
