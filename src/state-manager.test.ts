import { StateManager } from './state-manager';
import { CentriResponse, PluginConfig } from './types';

const baseConfig: PluginConfig = {
  name: 'Propane Tank',
  userId: 'user-id',
  deviceId: 'device-id',
  deviceAuthCode: 'auth-code',
};

const makeResponse = (tankLevel: number, lastPostTimeIso: string, tankSize = 250): CentriResponse => ({
  alertStatus: 'No Alert',
  batteryVolts: 4.1,
  batteryLevel: 91,
  isCharging: true,
  chargingStatus: 'Charging',
  deviceId: 'device-id',
  deviceName: 'My Tank',
  deviceTempFahrenheit: 63,
  lastPostTimeIso,
  nextPostTimeIso: '2026-04-18 13:00:00.000',
  signalQualLte: -107,
  solarVolts: 2.4,
  tankLevel,
  tankSize,
  tankSizeUnit: 'Gallons',
  hardwareVersion: '4.1',
  lteVersion: '1.1.2',
});

describe('StateManager', () => {
  let manager: StateManager;

  beforeEach(() => {
    manager = new StateManager();
  });

  it('returns null before any update', () => {
    expect(manager.getCurrent()).toBeNull();
  });

  it('returns true when state is null (first poll)', () => {
    expect(manager.hasChanged(makeResponse(50, '2026-04-18 07:00:00.000'))).toBe(true);
  });

  it('returns false when last post time is identical to cached state', () => {
    const ts = '2026-04-18 07:00:00.000';
    manager.update(makeResponse(50, ts), baseConfig);
    expect(manager.hasChanged(makeResponse(50, ts))).toBe(false);
  });

  it('returns true when last post time differs from cached state', () => {
    manager.update(makeResponse(50, '2026-04-18 07:00:00.000'), baseConfig);
    expect(manager.hasChanged(makeResponse(50, '2026-04-18 13:00:00.000'))).toBe(true);
  });

  it('stores percentage from TankLevel', () => {
    const state = manager.update(makeResponse(69, '2026-04-18 07:00:00.000'), baseConfig);
    expect(state.percentage).toBe(69);
  });

  it('stores last post timestamp', () => {
    const ts = '2026-04-18 07:26:26.723';
    const state = manager.update(makeResponse(50, ts), baseConfig);
    expect(state.lastRead).toBe(ts);
  });

  it('calculates gallons using API TankSize when no override is configured', () => {
    const state = manager.update(makeResponse(75, '2026-04-18 07:00:00.000', 1000), baseConfig);
    expect(state.gallons).toBe(750);
    expect(state.tankCapacityGallons).toBe(1000);
  });

  it('calculates gallons using configured tank capacity override when provided', () => {
    const state = manager.update(makeResponse(50, '2026-04-18 07:00:00.000', 1000), {
      ...baseConfig,
      tankCapacityGallons: 500,
    });
    expect(state.gallons).toBe(250);
    expect(state.tankCapacityGallons).toBe(500);
  });

  it('makes updated state available via getCurrent', () => {
    const ts = '2026-04-18 07:00:00.000';
    manager.update(makeResponse(42, ts), baseConfig);
    expect(manager.getCurrent()!.percentage).toBe(42);
  });

  it('stores monitor battery level and charging state from API fields', () => {
    const state = manager.update(makeResponse(42, '2026-04-18 07:00:00.000'), baseConfig);
    expect(state.batteryLevel).toBe(91);
    expect(state.isCharging).toBe(true);
  });

  it('falls back to voltage-derived battery percentage when percentage fields are unavailable', () => {
    const response = { ...makeResponse(42, '2026-04-18 07:00:00.000'), batteryLevel: null, isCharging: null, batteryVolts: 3.8, solarVolts: 1.7 };
    const state = manager.update(response, baseConfig);
    expect(state.batteryLevel).toBe(50);
    expect(state.isCharging).toBeNull();
  });
});
