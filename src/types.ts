export interface PluginConfig {
  name: string;
  userId: string;
  deviceId: string;
  deviceAuthCode: string;
  tankCapacityGallons?: number;
  pollIntervalMinutes?: number;
  lowThreshold?: number;
  batteryLowThreshold?: number;
  apiBaseUrl?: string;
}

export interface CentriResponse {
  alertStatus: string;
  batteryVolts: number;
  batteryLevel: number | null;
  isCharging: boolean | null;
  chargingStatus: string;
  deviceId: string;
  deviceName: string;
  deviceTempFahrenheit: number;
  lastPostTimeIso: string;
  nextPostTimeIso: string;
  signalQualLte: number;
  solarVolts: number;
  tankLevel: number;
  tankSize: number;
  tankSizeUnit: string;
  hardwareVersion: string;
  lteVersion: string;
}

export interface PropaneState {
  percentage: number;
  gallons: number;
  tankCapacityGallons: number;
  batteryLevel: number;
  isCharging: boolean | null;
  lastRead: string;
}
