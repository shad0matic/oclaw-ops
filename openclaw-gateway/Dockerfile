# Dockerfile for OpenClaw Gateway

# Base image
FROM node:20-alpine

# Install OpenClaw
RUN npm install -g openclaw

# Expose the gateway port
EXPOSE 8080

# Command to start the gateway
CMD ["openclaw", "gateway", "start"]
