import { Socket } from 'dgram';
import { EventEmitter } from 'events';

declare class actions {
    constructor(device: Device);
    private device;
    setColor: (color: colorOptions) => Promise<void>;
    /**
     * @description
     * Pass a 0-100 value to set the brightness of the device.
     */
    setBrightness: (brightness: string | number) => Promise<void>;
    /**
     * @description
     * #### Fade the color and brightness of your device.
     * **Warning**: This works by sending many many commands (At least every 10ms).
     *
     * Before the code gets run for sending values, the state of the device gets updated.
     * ***
     * Usage:
     * ```js
     * fadeColor({
            time: 2000, // In milliseconds
            color: {
                hex: "#282c34" // Other options possible
            },
            brightness: 20 // 0-100
        });
     * ```
     */
    fadeColor: (options: fadeOptions) => Promise<void>;
    /**
     * @description
     * Turn off a device.
     */
    setOff: () => Promise<void>;
    /**
     * @description
     * Turn on a device.
     */
    setOn: () => Promise<void>;
}
declare class GoveeConfig {
    /**
     * Automatically start searching for devices when the UDP socket is made.
     * @default true
     */
    startDiscover: boolean;
    /**
     * The interval (in ms) at which new devices will be scanned for.
     * @default 300000 (5 minutes)
     */
    discoverInterval: number;
}

interface DataResponseStatus {
    onOff: 0 | 1;
    brightness: number;
    color: {
        r: number;
        g: number;
        b: number;
    };
    colorTemInKelvin: number;
}
type stateChangedOptions = ("onOff" | "brightness" | "color" | undefined)[];
interface fadeOptions {
    time: number;
    color?: colorOptions;
    brightness?: number;
}
interface colorOptionsHex {
    hex: string;
    rgb?: never;
    hsl?: never;
    kelvin?: never;
}
interface colorOptionsRGB {
    hex?: never;
    rgb: [number, number, number];
    hsl?: never;
    kelvin?: never;
}
interface colorOptionsHSL {
    hex?: never;
    rgb?: never;
    hsl: [number, number, number];
    kelvin?: never;
}
interface colorOptionsKelvin {
    hex?: never;
    rgb?: never;
    hsl?: never;
    kelvin: string | number;
}
type colorOptions = colorOptionsHex | colorOptionsRGB | colorOptionsHSL | colorOptionsKelvin;
type DeviceEventTypes = {
    updatedStatus: (data: DataResponseStatus, stateChanged: stateChangedOptions) => void;
    destroyed: () => void;
};
declare class Device extends EventEmitter {
    constructor(data: Record<string, any>, GoveeInstance: Govee, socket: Socket);
    readonly ip: string;
    readonly deviceID: string;
    readonly model: string;
    readonly socket: Socket;
    readonly versions: {
        BLEhardware: string;
        BLEsoftware: string;
        WiFiHardware: string;
        WiFiSoftware: string;
    };
    state: {
        isOn: number;
        brightness: number;
        color: Record<string, number>;
        colorKelvin: number;
        hasReceivedUpdates: boolean;
    };
    readonly actions: actions;
    readonly updateValues: Function;
    private updateTimer;
    destroy: () => void;
}
declare interface Device {
    addListener<E extends keyof DeviceEventTypes>(event: E, listener: DeviceEventTypes[E]): this;
    on<E extends keyof DeviceEventTypes>(event: E, listener: DeviceEventTypes[E]): this;
    once<E extends keyof DeviceEventTypes>(event: E, listener: DeviceEventTypes[E]): this;
    prependListener<E extends keyof DeviceEventTypes>(event: E, listener: DeviceEventTypes[E]): this;
    prependOnceListener<E extends keyof DeviceEventTypes>(event: E, listener: DeviceEventTypes[E]): this;
    off<E extends keyof DeviceEventTypes>(event: E, listener: DeviceEventTypes[E]): this;
    removeAllListeners<E extends keyof DeviceEventTypes>(event?: E): this;
    removeListener<E extends keyof DeviceEventTypes>(event: E, listener: DeviceEventTypes[E]): this;
    emit<E extends keyof DeviceEventTypes>(event: E, ...args: Parameters<DeviceEventTypes[E]>): boolean;
    eventNames(): (keyof DeviceEventTypes | string | symbol)[];
    rawListeners<E extends keyof DeviceEventTypes>(event: E): DeviceEventTypes[E][];
    listeners<E extends keyof DeviceEventTypes>(event: E): DeviceEventTypes[E][];
    listenerCount<E extends keyof DeviceEventTypes>(event: E): number;
    getMaxListeners(): number;
    setMaxListeners(maxListeners: number): this;
}
type GoveeEventTypes = {
    ready: () => void;
    deviceAdded: (device: Device) => void;
    deviceRemoved: (device: Device) => void;
    updatedStatus: (device: Device, data: DataResponseStatus, stateChanged: stateChangedOptions) => void;
};
declare class Govee extends EventEmitter {
    constructor(config?: GoveeConfig);
    private discoverInterval;
    /**
     * @description
     * Use this function to re-send the command to scan for devices.
     *
     * Note that you typically don't have to run this command yourself.
     */
    discover(): void;
    private receiveMessage;
    get devicesMap(): Map<string, Device>;
    get devicesArray(): Device[];
    updateAllDevices(): void;
    destroy(): void;
}
interface Govee {
    addListener<E extends keyof GoveeEventTypes>(event: E, listener: GoveeEventTypes[E]): this;
    on<E extends keyof GoveeEventTypes>(event: E, listener: GoveeEventTypes[E]): this;
    once<E extends keyof GoveeEventTypes>(event: E, listener: GoveeEventTypes[E]): this;
    prependListener<E extends keyof GoveeEventTypes>(event: E, listener: GoveeEventTypes[E]): this;
    prependOnceListener<E extends keyof GoveeEventTypes>(event: E, listener: GoveeEventTypes[E]): this;
    off<E extends keyof GoveeEventTypes>(event: E, listener: GoveeEventTypes[E]): this;
    removeAllListeners<E extends keyof GoveeEventTypes>(event?: E): this;
    removeListener<E extends keyof GoveeEventTypes>(event: E, listener: GoveeEventTypes[E]): this;
    emit<E extends keyof GoveeEventTypes>(event: E, ...args: Parameters<GoveeEventTypes[E]>): boolean;
    eventNames(): (keyof GoveeEventTypes | string | symbol)[];
    rawListeners<E extends keyof GoveeEventTypes>(event: E): GoveeEventTypes[E][];
    listeners<E extends keyof GoveeEventTypes>(event: E): GoveeEventTypes[E][];
    listenerCount<E extends keyof GoveeEventTypes>(event: E): number;
    getMaxListeners(): number;
    setMaxListeners(maxListeners: number): this;
}

export { DataResponseStatus, Device, colorOptions, Govee as default, fadeOptions, stateChangedOptions };
