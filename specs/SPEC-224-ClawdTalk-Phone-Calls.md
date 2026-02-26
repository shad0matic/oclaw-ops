# SPEC-224-ClawdTalk-Phone-Calls.md

## Phone Call Capability for ClawdTalk

### Overview
Implement full phone call capability for OpenClaw using the official Voice Call plugin. This enables OpenClaw to make and receive phone calls for urgent communications with Boss.

### Requirements
- **Dedicated phone number** for OpenClaw (Twilio)
- **Outbound calls** - OpenClaw can call Boss for urgent issues
- **Inbound calls** - Boss can call OpenClaw
- **Voice interaction** - Real-time voice conversation capability

### Implementation

#### 1. Plugin Installation
The `@openclaw/voice-call` plugin is already available in the plugin registry but disabled.

#### 2. Configuration
Add to `openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "voice-call": {
        "enabled": true,
        "config": {
          "provider": "twilio",
          "fromNumber": "+1XXXXXXXXXX",  // OpenClaw's phone number
          "toNumber": "+33XXXXXXXXX",    // Boss's phone number
          
          "twilio": {
            "accountSid": "${TWILIO_ACCOUNT_SID}",
            "authToken": "${TWILIO_AUTH_TOKEN}"
          },
          
          "serve": {
            "port": 3334,
            "path": "/voice/webhook"
          },
          
          "tailscale": {
            "mode": "funnel",
            "path": "/voice/webhook"
          },
          
          "outbound": {
            "defaultMode": "notify"
          },
          
          "streaming": {
            "enabled": true
          }
        }
      }
    }
  }
}
```

#### 3. Required Credentials
- **Twilio Account SID** - From Twilio console
- **Twilio Auth Token** - From Twilio console  
- **Twilio Phone Number** - Purchased from Twilio

#### 4. TTS Configuration
Use existing ElevenLabs config from `messages.tts`.

### Testing
- Test outbound notification call
- Test voice conversation mode
- Test inbound call handling

### Status
- [x] Plugin available
- [ ] Plugin enabled
- [ ] Credentials configured
- [ ] Phone numbers configured
- [ ] Public webhook URL configured
- [ ] Tested outbound calls
- [ ] Tested inbound calls
