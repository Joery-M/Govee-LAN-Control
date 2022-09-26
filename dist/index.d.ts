import { Socket } from 'dgram';
import { EventEmitter } from 'events';

declare class Device {
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
    };
    readonly actions: actions;
}
interface fadeOptions {
    time: number;
    color: colorOptions;
    brightness?: number;
}
interface colorOptions {
    hex?: string;
    rgb?: [number, number, number];
    hsl?: [number, number, number];
}
declare class actions {
    constructor(device: Device);
    private device;
    setRGB: (color: colorOptions) => Promise<void>;
    setColorTemp: (color: string) => Promise<void>;
    setBrightness: (brightness: string | number) => Promise<void>;
    fadeColor: (options: fadeOptions) => Promise<void>;
    setOff: () => Promise<void>;
    setOn: () => Promise<void>;
}
declare interface Govee {
    on(event: 'ready', listener: Function): this;
    on(event: "deviceAdded", listener: (device: Device) => void): this;
    on(event: "newStatus", listener: (device: Device, data: DataResponseStatus) => void): this;
    on(event: string, listener: Function): this;
}
declare class Govee extends EventEmitter {
    constructor();
    discover(): Promise<void>;
    private receiveMessage;
    getDevicesMap(): Map<string, Device>;
    getDevicesArray(): Device[];
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

export { DataResponseStatus, Device, colorOptions, Govee as default, fadeOptions };
