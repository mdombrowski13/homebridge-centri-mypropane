jest.mock('./api-client');

import { fetchPropaneLevel } from './api-client';
import { PropaneTankAccessory } from './accessory';
import { PluginConfig } from './types';

const mockFetch = fetchPropaneLevel as jest.MockedFunction<typeof fetchPropaneLevel>;

// --- HAP mock factory ---

function makeMockChar() {
  return {
    updateValue: jest.fn().mockReturnThis(),
    onGet: jest.fn().mockReturnThis(),
    onSet: jest.fn().mockReturnThis(),
  };
}

function makeMockService() {
  const char = makeMockChar();
  return {
    _char: char,
    characteristics: [],
    setCharacteristic: jest.fn().mockReturnThis(),
    getCharacteristic: jest.fn().mockReturnValue(char),
    addCharacteristic: jest.fn().mockReturnValue(char),
    updateCharacteristic: jest.fn().mockReturnThis(),
  };
}

function makeMockPlatform() {
  const infoService = makeMockService();
  const batteryService = makeMockService();
  const propaneService = makeMockService();

  const MockService = Object.assign(jest.fn().mockImplementation(() => propaneService), {
    AccessoryInformation: 'AccessoryInformation',
    Battery: 'Battery',
    HumiditySensor: 'HumiditySensor',
  });

  const MockCharacteristic = Object.assign(jest.fn().mockImplementation(() => makeMockChar()), {
    BatteryLevel: 'BatteryLevel',
    ChargingState: { CHARGING: 1, NOT_CHARGING: 2, NOT_CHARGEABLE: 0 },
    CurrentRelativeHumidity: 'CurrentRelativeHumidity',
    StatusLowBattery: { BATTERY_LEVEL_LOW: 1, BATTERY_LEVEL_NORMAL: 0 },
  });

  const mockAccessory = {
    services: [],
    getService: jest.fn().mockImplementation((key: string) => {
      if (key === 'AccessoryInformation') return infoService;
      return undefined;
    }),
    addService: jest.fn().mockImplementation((serviceOrInstance) => {
      if (serviceOrInstance === 'Battery') return batteryService;
      return propaneService;
    }),
  };

  const log = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

  const platform = {
    log,
    api: {
      hap: {
        Service: MockService,
        Characteristic: MockCharacteristic,
        Formats: { FLOAT: 'float' },
        Perms: { NOTIFY: 'ev', PAIRED_READ: 'pr' },
        uuid: { generate: jest.fn().mockReturnValue('test-uuid') },
      },
    },
  };

  return { platform, mockAccessory, batteryService, propaneService, infoService };
}

const baseConfig: PluginConfig = {
  name: 'Propane Tank',
  userId: 'user-id',
  deviceId: 'device-id',
  deviceAuthCode: 'auth-code',
};

const validResponse = {
  alertStatus: 'No Alert',
  batteryVolts: 4.19,
  batteryLevel: 88,
  isCharging: true,
  chargingStatus: 'Charging',
  deviceId: 'device-id',
  deviceName: 'My Tank',
  deviceTempFahrenheit: 63,
  lastPostTimeIso: '2026-04-18 07:26:26.723',
  nextPostTimeIso: '2026-04-18 13:00:00.000',
  signalQualLte: -107,
  solarVolts: 2.46,
  tankLevel: 69,
  tankSize: 250,
  tankSizeUnit: 'Gallons',
  hardwareVersion: '4.1',
  lteVersion: '1.1.2',
};

async function runInitialPoll() {
  jest.advanceTimersByTime(5_000);
  await Promise.resolve();
}

// --- Tests ---

describe('PropaneTankAccessory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockFetch.mockResolvedValue(validResponse);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('poll interval clamping', () => {
    it('clamps pollIntervalMinutes below 60 to 60 and logs the exact warning', () => {
      const { platform, mockAccessory } = makeMockPlatform();
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      new PropaneTankAccessory(
        platform as never,
        mockAccessory as never,
        { ...baseConfig, pollIntervalMinutes: 5 },
      );

      expect(platform.log.warn).toHaveBeenCalledWith(
        '[CentriMyPropane] WARNING: pollIntervalMinutes (5) is below the 60-minute minimum. Using 60.',
      );
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60 * 60 * 1000);
    });

    it('does not warn or clamp when pollIntervalMinutes is exactly 60', () => {
      const { platform, mockAccessory } = makeMockPlatform();
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      new PropaneTankAccessory(
        platform as never,
        mockAccessory as never,
        { ...baseConfig, pollIntervalMinutes: 60 },
      );

      expect(platform.log.warn).not.toHaveBeenCalled();
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60 * 60 * 1000);
    });

    it('uses configured interval when above 60 minutes', () => {
      const { platform, mockAccessory } = makeMockPlatform();
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      new PropaneTankAccessory(
        platform as never,
        mockAccessory as never,
        { ...baseConfig, pollIntervalMinutes: 1440 },
      );

      expect(platform.log.warn).not.toHaveBeenCalled();
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1440 * 60 * 1000);
    });

    it('defaults to 360 minutes when pollIntervalMinutes is not set', () => {
      const { platform, mockAccessory } = makeMockPlatform();
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      new PropaneTankAccessory(platform as never, mockAccessory as never, baseConfig);

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 360 * 60 * 1000);
    });
  });

  describe('poll — characteristic update gating', () => {
    it('updates characteristics on first successful poll (state always changes from null)', async () => {
      const { platform, mockAccessory, batteryService } = makeMockPlatform();

      new PropaneTankAccessory(platform as never, mockAccessory as never, baseConfig);
      await runInitialPoll();

      expect(batteryService.updateCharacteristic).toHaveBeenCalled();
    });

    it('does not update characteristics when last post time is unchanged', async () => {
      const { platform, mockAccessory, batteryService } = makeMockPlatform();

      // Same last post time on both calls
      mockFetch.mockResolvedValue(validResponse);

      new PropaneTankAccessory(platform as never, mockAccessory as never, baseConfig);
      await runInitialPoll();

      const callsAfterFirst = batteryService.updateCharacteristic.mock.calls.length;

      // Trigger second poll
      jest.advanceTimersByTime(360 * 60 * 1000);
      await Promise.resolve();

      // No additional calls — same last post time means no change
      expect(batteryService.updateCharacteristic.mock.calls.length).toBe(callsAfterFirst);
    });

    it('updates characteristics again when last post time changes on second poll', async () => {
      const { platform, mockAccessory, batteryService } = makeMockPlatform();

      mockFetch
        .mockResolvedValueOnce(validResponse)
        .mockResolvedValueOnce({ ...validResponse, lastPostTimeIso: '2026-04-19 07:00:00.000', tankLevel: 65 });

      new PropaneTankAccessory(platform as never, mockAccessory as never, baseConfig);
      await runInitialPoll();

      const callsAfterFirst = batteryService.updateCharacteristic.mock.calls.length;

      jest.advanceTimersByTime(360 * 60 * 1000);
      await Promise.resolve();

      expect(batteryService.updateCharacteristic.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    });
  });

  describe('poll — failure handling', () => {
    it('logs a warning on poll failure and does not throw', async () => {
      const { platform, mockAccessory } = makeMockPlatform();

      mockFetch.mockRejectedValue(new Error('Network error'));

      const create = () =>
        new PropaneTankAccessory(platform as never, mockAccessory as never, baseConfig);

      expect(create).not.toThrow();
      await runInitialPoll();

      expect(platform.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Poll failed — using cached state'),
      );
    });

    it('logs a warning on timeout and does not throw', async () => {
      const { platform, mockAccessory } = makeMockPlatform();

      mockFetch.mockRejectedValue(new DOMException('Aborted', 'AbortError'));

      new PropaneTankAccessory(platform as never, mockAccessory as never, baseConfig);
      await runInitialPoll();

      expect(platform.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Poll failed — using cached state'),
      );
    });
  });

  describe('low battery threshold', () => {
    it('defaults batteryLowThreshold to 20 when not configured', async () => {
      const { platform, mockAccessory, batteryService } = makeMockPlatform();
      mockFetch.mockResolvedValue({ ...validResponse, batteryLevel: 15 }); // below default battery threshold

      new PropaneTankAccessory(platform as never, mockAccessory as never, baseConfig);
      await runInitialPoll();

      // StatusLowBattery should be BATTERY_LEVEL_LOW (1)
      const calls = batteryService.updateCharacteristic.mock.calls;
      const lowBatteryCall = calls.find(([, val]) => val === 1);
      expect(lowBatteryCall).toBeDefined();
    });

    it('respects a custom batteryLowThreshold from config', async () => {
      const { platform, mockAccessory, batteryService } = makeMockPlatform();
      mockFetch.mockResolvedValue({ ...validResponse, batteryLevel: 60 }); // above default 20, below custom 70

      new PropaneTankAccessory(
        platform as never,
        mockAccessory as never,
        { ...baseConfig, batteryLowThreshold: 70 },
      );
      await runInitialPoll();

      const calls = batteryService.updateCharacteristic.mock.calls;
      const lowBatteryCall = calls.find(([, val]) => val === 1);
      expect(lowBatteryCall).toBeDefined();
    });

    it('updates BatteryLevel from monitor battery instead of propane percentage', async () => {
      const { platform, mockAccessory, batteryService } = makeMockPlatform();
      mockFetch.mockResolvedValue({ ...validResponse, tankLevel: 35, batteryLevel: 88 });

      new PropaneTankAccessory(platform as never, mockAccessory as never, baseConfig);
      await runInitialPoll();

      expect(batteryService.updateCharacteristic).toHaveBeenCalledWith(
        platform.api.hap.Characteristic.BatteryLevel,
        88,
      );
    });

    it('updates ChargingState from monitor charging status', async () => {
      const { platform, mockAccessory, batteryService } = makeMockPlatform();
      mockFetch.mockResolvedValue({ ...validResponse, isCharging: true });

      new PropaneTankAccessory(platform as never, mockAccessory as never, baseConfig);
      await runInitialPoll();

      expect(batteryService.updateCharacteristic).toHaveBeenCalledWith(
        platform.api.hap.Characteristic.ChargingState,
        platform.api.hap.Characteristic.ChargingState.CHARGING,
      );
    });
  });
});
