#!/bin/bash
# Setup script for task-queue-listener systemd service
# Run with: sudo ./setup-task-listener-service.sh

SERVICE_FILE="/etc/systemd/system/task-queue-listener.service"

if [ "$EUID" -ne 0 ]; then
  echo "Please run as sudo: sudo $0"
  exit 1
fi

echo "Installing task-queue-listener.service..."
cp "$(dirname "$0")/task-queue-listener.service" "$SERVICE_FILE"
chmod 644 "$SERVICE_FILE"

echo "Reloading systemd..."
systemctl daemon-reload

echo "Enabling service..."
systemctl enable task-queue-listener.service

echo "Starting service..."
systemctl start task-queue-listener.service

echo "Checking status..."
systemctl status task-queue-listener.service --no-pager
