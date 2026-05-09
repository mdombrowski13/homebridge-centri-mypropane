# homebridge-centri-mypropane

A [Homebridge](https://homebridge.io) plugin that integrates Centri MyPropane / CentriConnect propane tank monitors into Apple HomeKit.

Monitor your propane level as a percentage, estimate gallons remaining, and expose the monitor's actual battery state to HomeKit.

---

## How It Works

Centri MyPropane sensors report tank telemetry to the CentriConnect cloud. This plugin polls the public CentriConnect device-data endpoint on a configurable schedule and exposes your tank to HomeKit using:

- A Humidity Sensor service so the Home app can display a percentage tile
- A Battery service for the monitor's real battery percentage and charging state
- A custom Propane service for gallons remaining and tank capacity metadata

The API endpoint used by this plugin is:

```text
GET https://api.centriconnect.com/centriconnect/<userId>/device/<deviceId>/all-data?device_auth=<deviceAuthCode>
```

The MyPropane device typically uploads a few times per day. The plugin defaults to polling every 6 hours to match the Home Assistant examples and avoid unnecessary API traffic.

---

## Requirements

- [Homebridge](https://homebridge.io) v1.8.5 or later
- Node.js v20, v22, or v24
- A Centri MyPropane tank monitor added to the MyPropane app
- Your Centri `userId`, `deviceId`, and `deviceAuthCode`

---

## Finding Your Credentials

You need three values:

| Field | Where to find it |
|---|---|
| `userId` | MyPropane iOS app account/profile settings |
| `deviceId` | Card included with the sensor |
| `deviceAuthCode` | Card included with the sensor |

The card may also include a serial number. The API examples found for CentriConnect use `userId`, `deviceId`, and `deviceAuthCode`; the serial number is not used by this plugin.

---

## Installation

### From npm

```bash
npm install -g homebridge-centri-mypropane
```

Then add the platform block to your Homebridge `config.json` (see Configuration below) and restart Homebridge.

### Via Homebridge UI

1. Open the Homebridge UI
2. Go to **Plugins** and search for `homebridge-centri-mypropane`
3. Click **Install**
4. Configure via the plugin settings form (see Configuration below)
5. Restart Homebridge

### From Source

```bash
git clone https://github.com/mdombrowski13/homebridge-centri-mypropane.git
cd homebridge-centri-mypropane
npm install
npm run build
sudo npm install -g .
```

---

## Configuration

```json
{
  "platforms": [
    {
      "platform": "CentriMyPropane",
      "name": "Propane Tank",
      "userId": "YOUR_USER_ID",
      "deviceId": "YOUR_DEVICE_ID",
      "deviceAuthCode": "YOUR_DEVICE_AUTH_CODE",
      "pollIntervalMinutes": 360,
      "lowThreshold": 30,
      "batteryLowThreshold": 20
    }
  ]
}
```

### Configuration Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `platform` | string | yes | - | Must be `CentriMyPropane` |
| `name` | string | yes | `Propane Tank` | Display name in HomeKit |
| `userId` | string | yes | - | Centri/MyPropane account user ID |
| `deviceId` | string | yes | - | Device ID from the card included with the sensor |
| `deviceAuthCode` | string | yes | - | Device authentication code from the card |
| `tankCapacityGallons` | number | no | API `TankSize` | Optional tank capacity override |
| `pollIntervalMinutes` | number | no | `360` | How often to poll the API, in minutes |
| `lowThreshold` | number | no | `30` | Propane percentage threshold to use in HomeKit automations from the propane percent sensor |
| `batteryLowThreshold` | number | no | `20` | Monitor battery percentage below which HomeKit reports low battery |
| `apiBaseUrl` | string | no | `https://api.centriconnect.com/centriconnect` | Advanced override if the API base URL changes |

---

## HomeKit Behavior

| Element | Behavior |
|---|---|
| Room tile | Shows propane level as a percentage |
| Battery service | Shows the monitor's actual battery percentage and charging state |
| Low battery alert | Triggers when monitor battery drops below `batteryLowThreshold` |
| Automations | Can trigger from the propane percentage sensor or monitor battery status |
| Gallons remaining | Visible in advanced HomeKit apps such as Eve or Home+ |

---

## Known Limitations

- No local LAN access; this is a cloud polling integration
- Polling more often than the device posts new data will usually return stale data
- Gallons remaining is derived from `TankLevel` and either API `TankSize` or `tankCapacityGallons`
- If the API response does not include a battery percentage, the plugin estimates battery percentage from `BatteryVolts`
- If the API response does not include an explicit charging boolean/status, the plugin reports charging state as not chargeable instead of guessing from `SolarVolts`
- HomeKit has no native propane tank service, so the plugin maps propane percentage onto HomeKit-compatible services

---

## Acknowledgements

API behavior was cross-checked against Centri/MyPropane Home Assistant community examples and the open-source `aiocentriconnect` Python client.

## License

MIT
