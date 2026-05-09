import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig } from 'homebridge';
import { PluginConfig } from './types';
import { PropaneTankAccessory } from './accessory';

export const PLUGIN_NAME = 'homebridge-centri-mypropane';
export const PLATFORM_NAME = 'CentriMyPropane';

export class PropaneTankPlatform implements DynamicPlatformPlugin {
  private readonly cachedAccessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.api.on('didFinishLaunching', () => {
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.cachedAccessories.push(accessory);
  }

  private discoverDevices(): void {
    const pluginConfig = this.config as unknown as PluginConfig;

    if (!pluginConfig.userId) {
      this.log.error('[CentriMyPropane] userId is required in config — accessory not registered.');
      return;
    }

    if (!pluginConfig.deviceId) {
      this.log.error('[CentriMyPropane] deviceId is required in config — accessory not registered.');
      return;
    }

    if (!pluginConfig.deviceAuthCode) {
      this.log.error('[CentriMyPropane] deviceAuthCode is required in config — accessory not registered.');
      return;
    }

    const uuid = this.api.hap.uuid.generate(pluginConfig.deviceId);
    const existing = this.cachedAccessories.find(a => a.UUID === uuid);

    if (existing) {
      this.log.info(`[CentriMyPropane] Restoring cached accessory: ${existing.displayName}`);
      new PropaneTankAccessory(this, existing, pluginConfig);
    } else {
      this.log.info(`[CentriMyPropane] Registering new accessory: ${pluginConfig.name}`);
      const accessory = new this.api.platformAccessory(pluginConfig.name, uuid);
      new PropaneTankAccessory(this, accessory, pluginConfig);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }
}
