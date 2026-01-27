# Testing on Mobile Devices

This guide explains how to test your local development server on a mobile device.

## Quick Start

1. **Start the dev server with network access:**

   ```bash
   yarn dev:network
   # or
   npm run dev:network
   ```

2. **Find your local IP address:**

   **On Linux:**

   ```bash
   ip addr show | grep "inet " | grep -v 127.0.0.1
   # or
   hostname -I
   ```

   **On macOS:**

   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   # or
   ipconfig getifaddr en0  # for Wi-Fi
   ipconfig getifaddr en1  # for Ethernet
   ```

   **On Windows:**

   ```bash
   ipconfig
   # Look for "IPv4 Address" under your active network adapter
   ```

3. **Access from your mobile device:**
   - Make sure your mobile device is on the **same Wi-Fi network** as your computer
   - Open a browser on your mobile device
   - Navigate to: `http://YOUR_IP_ADDRESS:3000`
   - Example: `http://192.168.1.100:3000`

## Troubleshooting

### Can't connect from mobile device

1. **Check firewall settings:**

   - Make sure your firewall allows incoming connections on port 3000
   - On Linux, you might need to allow the port:
     ```bash
     sudo ufw allow 3000
     ```
   - On macOS, check System Preferences → Security & Privacy → Firewall

2. **Verify same network:**

   - Both devices must be on the same Wi-Fi network
   - Some corporate/public networks block device-to-device communication

3. **Try using your computer's hostname:**
   - Sometimes using the hostname works better than IP
   - Example: `http://your-computer-name.local:3000`

### Wallet connections not working

- **Freighter Mobile:** Should work fine over HTTP for local testing
- **Privy Embedded Wallets:** Automatically disabled when testing over HTTP (localhost or local IP). This is intentional - embedded wallets require HTTPS for security. You can still use Freighter or other external wallets.
- **WalletConnect:** May require HTTPS. Consider using a tunneling service (see below)

### Need HTTPS for wallet testing?

Some wallets require HTTPS. You can use a tunneling service:

**Option 1: ngrok (recommended)**

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
# Use the HTTPS URL provided (e.g., https://abc123.ngrok.io)
```

**Option 2: Cloudflare Tunnel**

```bash
# Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
cloudflared tunnel --url http://localhost:3000
```

**Option 3: localtunnel**

```bash
npm install -g localtunnel
lt --port 3000
```

## Notes

- The `dev:network` script binds to `0.0.0.0`, making the server accessible from other devices on your network
- Regular `dev` script only binds to `localhost` (127.0.0.1) for security
- Hot reloading works on mobile devices too!
- Make sure to use `http://` not `https://` unless you're using a tunneling service
- **Privy Embedded Wallets:** Automatically disabled when accessing over HTTP (localhost or local IP addresses). This prevents the "embedded wallet is only available over HTTPS" error. External wallets like Freighter will work fine.
