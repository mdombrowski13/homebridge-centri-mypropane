import { Logger } from 'homebridge';
import { CentriResponse, PluginConfig } from './types';

const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_API_BASE_URL = 'https://api.centriconnect.com/centriconnect';

function readFiniteNumber(data: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function readString(data: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return '';
}

function readBoolean(data: Record<string, unknown>, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value !== 0;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', 'charging', 'charge', '1', 'yes', 'on'].includes(normalized)) {
        return true;
      }
      if (['false', 'not charging', 'not_charging', '0', 'no', 'off', 'idle'].includes(normalized)) {
        return false;
      }
    }
  }
  return null;
}

export async function fetchPropaneLevel(config: PluginConfig, log: Logger): Promise<CentriResponse> {
  const apiBaseUrl = (config.apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');
  const url = `${apiBaseUrl}/${config.userId}/device/${config.deviceId}/all-data?device_auth=${encodeURIComponent(config.deviceAuthCode)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let data: Record<string, unknown>;

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} from ${url}`);
    }

    data = await response.json() as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }

  const tank = data[config.deviceId];
  if (typeof tank !== 'object' || tank === null || Array.isArray(tank)) {
    log.warn(`[CentriMyPropane] Unexpected response shape — deviceId ${config.deviceId} missing. Response: ${JSON.stringify(data)}`);
    throw new Error(`Invalid API response: deviceId ${config.deviceId} missing`);
  }

  const tankData = tank as Record<string, unknown>;

  if (typeof tankData.TankLevel !== 'number' || !Number.isFinite(tankData.TankLevel)) {
    log.warn(`[CentriMyPropane] Unexpected response shape — TankLevel missing or invalid. Response: ${JSON.stringify(data)}`);
    throw new Error('Invalid API response: TankLevel missing or not a finite number');
  }

  if (typeof tankData.LastPostTimeIso !== 'string' || tankData.LastPostTimeIso === '') {
    log.warn(`[CentriMyPropane] Unexpected response shape — LastPostTimeIso missing or invalid. Response: ${JSON.stringify(data)}`);
    throw new Error('Invalid API response: LastPostTimeIso missing or empty');
  }

  if (typeof tankData.TankSize !== 'number' || !Number.isFinite(tankData.TankSize)) {
    log.warn(`[CentriMyPropane] Unexpected response shape — TankSize missing or invalid. Response: ${JSON.stringify(data)}`);
    throw new Error('Invalid API response: TankSize missing or not a finite number');
  }

  const batteryLevel = readFiniteNumber(tankData, [
    'BatteryLevel',
    'BatteryPercent',
    'BatteryPercentage',
    'BatteryPct',
    'BatteryStateOfCharge',
    'BatterySOC',
  ]);
  const chargingStatus = readString(tankData, [
    'ChargingStatus',
    'ChargeStatus',
    'BatteryChargingStatus',
    'SolarChargingStatus',
  ]);
  const isCharging = readBoolean(tankData, [
    'IsCharging',
    'Charging',
    'BatteryCharging',
    'SolarCharging',
    'ChargingStatus',
    'ChargeStatus',
    'BatteryChargingStatus',
    'SolarChargingStatus',
  ]);

  return {
    alertStatus: typeof tankData.AlertStatus === 'string' ? tankData.AlertStatus : '',
    batteryVolts: typeof tankData.BatteryVolts === 'number' ? tankData.BatteryVolts : 0,
    batteryLevel: batteryLevel === null ? null : Math.max(0, Math.min(100, batteryLevel)),
    isCharging,
    chargingStatus,
    deviceId: typeof tankData.DeviceID === 'string' ? tankData.DeviceID : config.deviceId,
    deviceName: typeof tankData.DeviceName === 'string' ? tankData.DeviceName : config.name,
    deviceTempFahrenheit: typeof tankData.DeviceTempFahrenheit === 'number' ? tankData.DeviceTempFahrenheit : 0,
    lastPostTimeIso: tankData.LastPostTimeIso,
    nextPostTimeIso: typeof tankData.NextPostTimeIso === 'string' ? tankData.NextPostTimeIso : '',
    signalQualLte: typeof tankData.SignalQualLTE === 'number' ? tankData.SignalQualLTE : 0,
    solarVolts: typeof tankData.SolarVolts === 'number' ? tankData.SolarVolts : 0,
    tankLevel: tankData.TankLevel,
    tankSize: tankData.TankSize,
    tankSizeUnit: typeof tankData.TankSizeUnit === 'string' ? tankData.TankSizeUnit : 'Gallons',
    hardwareVersion: typeof tankData.VersionHW === 'string' ? tankData.VersionHW : '',
    lteVersion: typeof tankData.VersionLTE === 'string' ? tankData.VersionLTE : '',
  };
}
