import { CentriResponse, PluginConfig, PropaneState } from './types';

export class StateManager {
  private state: PropaneState | null = null;

  hasChanged(response: CentriResponse): boolean {
    if (this.state === null) return true;
    return this.state.lastRead !== response.lastPostTimeIso;
  }

  update(response: CentriResponse, config: PluginConfig): PropaneState {
    const tankCapacityGallons = config.tankCapacityGallons ?? response.tankSize;
    const gallons = (response.tankLevel / 100) * tankCapacityGallons;
    this.state = {
      percentage: response.tankLevel,
      gallons,
      tankCapacityGallons,
      batteryLevel: response.batteryLevel ?? estimateBatteryLevelFromVolts(response.batteryVolts),
      isCharging: response.isCharging,
      lastRead: response.lastPostTimeIso,
    };
    return this.state;
  }

  getCurrent(): PropaneState | null {
    return this.state;
  }
}

function estimateBatteryLevelFromVolts(volts: number): number {
  if (!Number.isFinite(volts) || volts <= 0) {
    return 0;
  }

  // Centri community examples describe roughly 3.5V as empty and 4.1V as full.
  const pct = ((volts - 3.5) / (4.1 - 3.5)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}
