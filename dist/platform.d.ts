import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig } from 'homebridge';
export declare const PLUGIN_NAME = "homebridge-centri-mypropane";
export declare const PLATFORM_NAME = "CentriMyPropane";
export declare class PropaneTankPlatform implements DynamicPlatformPlugin {
    readonly log: Logger;
    readonly config: PlatformConfig;
    readonly api: API;
    private readonly cachedAccessories;
    constructor(log: Logger, config: PlatformConfig, api: API);
    configureAccessory(accessory: PlatformAccessory): void;
    private discoverDevices;
}
