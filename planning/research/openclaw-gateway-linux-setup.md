# OpenClaw Gateway Persistent Setup for Linux

This guide provides the recommended one-time setup for running the OpenClaw Gateway on a headless Linux server (like a Debian VPS) to avoid daily "device token mismatch" errors and ensure persistence.

## 1. The Problem: Device Token Mismatches

The "device token mismatch" error occurs when the OpenClaw Gateway restarts and loses its state, particularly the device authentication token. This typically happens when the gateway is not running as a persistent service, and its configuration and state files are not consistently read from the same location on each startup. The key is to ensure the gateway's state is preserved across reboots and restarts.

## 2. The Solution: systemd System Service

For an always-on headless server, the recommended approach is to run the OpenClaw Gateway as a **systemd system service**. This is different from a *user service* and has the following advantages:

*   **Runs on Boot:** The service starts automatically when the server boots up, without requiring a user to log in.
*   **Runs Continuously:** It runs in the background and is automatically restarted if it crashes.
*   **Consistent Environment:** It runs as a dedicated user, ensuring that the configuration and state files are always stored and accessed from the same location.

## 3. One-Time Setup Guide

Follow these steps to configure the gateway as a systemd system service.

### Step 1: Create a Dedicated User (Recommended)

To avoid running the gateway as root and to keep permissions clean, create a dedicated user for OpenClaw.

```bash
sudo adduser --system --group openclaw
```

### Step 2: Create the systemd Service File

Create a new systemd service file.

```bash
sudo nano /etc/systemd/system/openclaw-gateway.service
```

Paste the following content into the file. **Make sure to replace `<user>` with the username you created in Step 1 (e.g., `openclaw`).** If you are not using a dedicated user, replace `<user>` with your own username.

```ini
[Unit]
Description=OpenClaw Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=<user>
Group=<user>
ExecStart=/usr/local/bin/openclaw gateway
Restart=always
RestartSec=5
Environment="HOME=/home/<user>"
Environment="USER=/home/<user>"

[Install]
WantedBy=multi-user.target
```

**Key parts of this configuration:**

*   `User=<user>` and `Group=<user>`: Runs the process as the specified, unprivileged user.
*   `Restart=always`: Ensures the service restarts automatically.
*   `Environment="HOME=/home/<user>"`: Explicitly sets the HOME directory for the service. This is **critical** for ensuring that OpenClaw consistently finds its configuration in `/home/<user>/.openclaw/`.

### Step 3: Enable and Start the Service

Now, reload the systemd daemon, enable the new service to start on boot, and start it immediately.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway.service
```

### Step 4: Verify the Service

Check the status of the service to ensure it's running correctly.

```bash
sudo systemctl status openclaw-gateway.service
```

You can also view the logs:

```bash
sudo journalctl -u openclaw-gateway.service -f
```

## 4. Configuration and File Permissions

With this setup, OpenClaw's configuration and state will be stored in the home directory of the user you specified (e.g., `/home/openclaw/.openclaw/`).

*   **Configuration File:** `/home/openclaw/.openclaw/openclaw.json`
*   **State Directory:** `/home/openclaw/.openclaw/state/`

Ensure the user running the service has ownership of this directory:

```bash
sudo chown -R openclaw:openclaw /home/openclaw/.openclaw
```

By using this systemd service, the gateway will maintain a stable device token and configuration, resolving the daily mismatch errors.
