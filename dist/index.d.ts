import { Socket } from 'dgram';
import { EventEmitter } from 'events';

interface DeviceEventTypes {
    updatedStatus: [data: DataResponseStatus, stateChanged: stateChangedOptions];
    destroyed: [];
}
declare interface Device {
    on<K extends keyof DeviceEventTypes>(event: K, listener: (...args: DeviceEventTypes[K]) => any): this;
    once<K extends keyof DeviceEventTypes>(event: K, listener: (...args: DeviceEventTypes[K]) => any): this;
}
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
interface GoveeEventTypes {
    ready: [];
    deviceAdded: [device: Device];
    deviceRemoved: [device: Device];
    updatedStatus: [device: Device, data: DataResponseStatus, stateChanged: stateChangedOptions];
}
declare var udpSocket: Socket;
declare interface Govee {
    on<K extends keyof GoveeEventTypes>(event: K, listener: (...args: GoveeEventTypes[K]) => any): this;
    once<K extends keyof GoveeEventTypes>(event: K, listener: (...args: GoveeEventTypes[K]) => any): this;
}
declare class Govee extends EventEmitter {
    constructor(startDiscover?: boolean);
    private discoverInterval;
    discover(): Promise<void>;
    private receiveMessage;
    get devicesMap(): Map<string, Device>;
    get devicesArray(): Device[];
    updateAllDevices(): void;
    destroy(): void;
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
declare type stateChangedOptions = ("onOff" | "brightness" | "color" | undefined)[];
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
declare type colorOptions = colorOptionsHex | colorOptionsRGB | colorOptionsHSL | colorOptionsKelvin;

export { DataResponseStatus, Device, colorOptions, Govee as default, fadeOptions, stateChangedOptions, udpSocket };
