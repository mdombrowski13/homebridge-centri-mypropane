import { fetchPropaneLevel } from './api-client';
import { PluginConfig } from './types';

const deviceId = '123a4b5c-678d-9e0f-a123-4b567c8d901e';

const baseConfig: PluginConfig = {
  name: 'Propane Tank',
  userId: '12345678-9012-3456-7a89-b012345cde6f',
  deviceId,
  deviceAuthCode: '123456',
};

const mockLog = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const validTankData = {
  AlertStatus: 'No Alert',
  BatteryVolts: 4.19,
  BatteryPercent: 88,
  ChargingStatus: 'Charging',
  DeviceID: deviceId,
  DeviceName: 'My Tank',
  DeviceTempFahrenheit: 63.0,
  LastPostTimeIso: '2026-02-27 22:00:31.000',
  NextPostTimeIso: '2026-02-28 10:00:00.000',
  SignalQualLTE: -107.0,
  SolarVolts: 2.46,
  TankLevel: 75.0,
  TankSize: 1000,
  TankSizeUnit: 'Gallons',
  VersionHW: '4.1',
  VersionLTE: '1.1.2',
};

const validApiResponse = {
  [deviceId]: validTankData,
};

function makeFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => body,
  } as unknown as Response;
}

describe('fetchPropaneLevel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('returns normalized Centri tank data on success', async () => {
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(validApiResponse));

    const result = await fetchPropaneLevel(baseConfig, mockLog as never);

    expect(result.tankLevel).toBe(75);
    expect(result.tankSize).toBe(1000);
    expect(result.lastPostTimeIso).toBe('2026-02-27 22:00:31.000');
    expect(result.deviceName).toBe('My Tank');
    expect(result.batteryVolts).toBe(4.19);
    expect(result.batteryLevel).toBe(88);
    expect(result.isCharging).toBe(true);
    expect(result.chargingStatus).toBe('Charging');
  });

  it('constructs the CentriConnect URL correctly', async () => {
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(validApiResponse));
    await fetchPropaneLevel(baseConfig, mockLog as never);

    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.centriconnect.com/centriconnect/${baseConfig.userId}/device/${deviceId}/all-data?device_auth=123456`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('uses configured apiBaseUrl when provided', async () => {
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(validApiResponse));
    await fetchPropaneLevel(
      { ...baseConfig, apiBaseUrl: 'https://example.test/root/' },
      mockLog as never,
    );

    expect(global.fetch).toHaveBeenCalledWith(
      `https://example.test/root/${baseConfig.userId}/device/${deviceId}/all-data?device_auth=123456`,
      expect.anything(),
    );
  });

  it('throws on HTTP error status', async () => {
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse({}, 500));
    await expect(fetchPropaneLevel(baseConfig, mockLog as never)).rejects.toThrow('HTTP 500');
  });

  it('throws and logs a warning when the keyed device object is missing', async () => {
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse({ other: validTankData }));
    await expect(fetchPropaneLevel(baseConfig, mockLog as never)).rejects.toThrow('deviceId');
    expect(mockLog.warn).toHaveBeenCalledWith(expect.stringContaining('deviceId'));
  });

  it('throws and logs a warning when TankLevel is missing', async () => {
    const bad = { [deviceId]: { ...validTankData, TankLevel: undefined } };
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(bad));
    await expect(fetchPropaneLevel(baseConfig, mockLog as never)).rejects.toThrow('TankLevel');
    expect(mockLog.warn).toHaveBeenCalledWith(expect.stringContaining('TankLevel'));
  });

  it('throws and logs a warning when LastPostTimeIso is missing', async () => {
    const bad = { [deviceId]: { ...validTankData, LastPostTimeIso: undefined } };
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(bad));
    await expect(fetchPropaneLevel(baseConfig, mockLog as never)).rejects.toThrow('LastPostTimeIso');
    expect(mockLog.warn).toHaveBeenCalledWith(expect.stringContaining('LastPostTimeIso'));
  });

  it('throws and logs a warning when TankSize is missing', async () => {
    const bad = { [deviceId]: { ...validTankData, TankSize: undefined } };
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(bad));
    await expect(fetchPropaneLevel(baseConfig, mockLog as never)).rejects.toThrow('TankSize');
    expect(mockLog.warn).toHaveBeenCalledWith(expect.stringContaining('TankSize'));
  });

  it('fills optional fields with safe defaults', async () => {
    const minimal = {
      [deviceId]: {
        DeviceID: deviceId,
        TankLevel: 50,
        TankSize: 500,
        LastPostTimeIso: '2026-02-27 22:00:31.000',
      },
    };
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(minimal));

    const result = await fetchPropaneLevel(baseConfig, mockLog as never);

    expect(result.deviceName).toBe('Propane Tank');
    expect(result.tankSizeUnit).toBe('Gallons');
    expect(result.solarVolts).toBe(0);
    expect(result.batteryLevel).toBeNull();
    expect(result.isCharging).toBeNull();
  });

  it('recognizes alternate battery percentage and charging field names', async () => {
    const response = {
      [deviceId]: {
        ...validTankData,
        BatteryPercent: undefined,
        ChargingStatus: undefined,
        BatteryPercentage: '77',
        IsCharging: 1,
      },
    };
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(response));

    const result = await fetchPropaneLevel(baseConfig, mockLog as never);

    expect(result.batteryLevel).toBe(77);
    expect(result.isCharging).toBe(true);
  });

  it('throws when fetch is aborted (timeout)', async () => {
    global.fetch = jest.fn().mockImplementation((_url, options: RequestInit) => {
      return new Promise((_resolve, reject) => {
        (options.signal as AbortSignal).addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    });

    jest.useFakeTimers();
    const fetchPromise = fetchPropaneLevel(baseConfig, mockLog as never);
    jest.advanceTimersByTime(10001);
    await expect(fetchPromise).rejects.toThrow();
  });
});
