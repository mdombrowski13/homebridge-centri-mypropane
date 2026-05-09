import { PlatformAccessory } from 'homebridge';
import { PropaneTankPlatform } from './platform';
import { PluginConfig } from './types';
export declare class PropaneTankAccessory {
    private readonly platform;
    private readonly accessory;
    private readonly infoService;
    private readonly humiditySensor;
    private readonly batteryService;
    private readonly propaneService;
    private readonly gallonsChar;
    private readonly tankCapacityChar;
    private readonly stateManager;
    private readonly pollIntervalMs;
    private readonly lowThreshold;
    private readonly batteryLowThreshold;
    private readonly resolvedConfig;
    constructor(platform: PropaneTankPlatform, accessory: PlatformAccessory, config: PluginConfig);
    private getLowBatteryStatus;
    private poll;
    private updateCharacteristics;
    private getChargingState;
}
