"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateManager = void 0;
class StateManager {
    constructor() {
        this.state = null;
    }
    hasChanged(response) {
        if (this.state === null)
            return true;
        return this.state.lastRead !== response.lastPostTimeIso;
    }
    update(response, config) {
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
    getCurrent() {
        return this.state;
    }
}
exports.StateManager = StateManager;
function estimateBatteryLevelFromVolts(volts) {
    if (!Number.isFinite(volts) || volts <= 0) {
        return 0;
    }
    // Centri community examples describe roughly 3.5V as empty and 4.1V as full.
    const pct = ((volts - 3.5) / (4.1 - 3.5)) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
}
