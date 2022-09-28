import { EventEmitter } from "stream";
import { colorOptions, DataResponseStatus, Device, fadeOptions } from "..";
import { hex, hsl, rgb } from "color-convert";
import * as ct from 'color-temperature';

/**
 * 
 * @param x Starting number
 * @param y Ending number
 * @param a percent (0-1)
 */
const lerp = (x: number, y: number, a: number) => x * (1 - a) + y * a;
/**
 * 
 * @param a Starting number
 * @param b Ending number
 * @param amount percent (0-1)
 */
function lerpColor (a: string, b: string, amount: number)
{

    var ah = parseInt(a.replace(/#/g, ''), 16),
        ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
        bh = parseInt(b.replace(/#/g, ''), 16),
        br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
        rr = ar + amount * (br - ar),
        rg = ag + amount * (bg - ag),
        rb = ab + amount * (bb - ab);

    return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
}

export function setColor (this: Device, options: colorOptions): Promise<void>
{
    return new Promise((resolve, reject) =>
    {
        var rgb = { r: 0, g: 0, b: 0 };
        var message: string;

        if (options.kelvin)
        {
            var kelvin = parseFloat(options.kelvin.toString().replace(/[^0-9]/g, ""));

            message = JSON.stringify(
                {
                    msg: {
                        cmd: "colorwc",
                        data: {
                            colorTemInKelvin: kelvin
                        }
                    }
                }
            );
        } else
        {
            if (options.hex)
            {
                var newColor = hex.rgb(options.hex);
                rgb = {
                    r: newColor[0],
                    g: newColor[1],
                    b: newColor[2]
                };
            } else if (options.hsl)
            {
                var newColor = hsl.rgb(options.hsl);
                rgb = {
                    r: newColor[0],
                    g: newColor[1],
                    b: newColor[2]
                };
            } else if (options.rgb)
            {
                rgb = {
                    r: options.rgb[0],
                    g: options.rgb[1],
                    b: options.rgb[2]
                };
            }

            message = JSON.stringify(
                {
                    msg: {
                        cmd: "colorwc",
                        data: {
                            color: rgb
                        }
                    }
                }
            );
        }

        this.socket?.send(message, 0, message.length, 4001, this.ip, () =>
        {
            updateValues(this);
            resolve();
        });
    });
}

export function setBrightness (this: Device, brightness: number | string): Promise<void>
{
    return new Promise((resolve, reject) =>
    {
        var bright = parseFloat(brightness.toString());
        let message = JSON.stringify(
            {
                "msg": {
                    "cmd": "brightness",
                    "data": {
                        "value": bright,
                    }
                }
            }
        );
        this.socket?.send(message, 0, message.length, 4001, this.ip, () =>
        {
            updateValues(this);
            resolve();
        });
    });
}

export function fade (this: Device, eventEmitter: EventEmitter, options: fadeOptions): Promise<void>
{
    return new Promise((resolve, reject) =>
    {
        //? Get current value
        updateValues(this);

        eventEmitter.once("newStatus", async (device: Device, data: DataResponseStatus) =>
        {
            if (device.deviceID !== this.deviceID) return;
            var curHex = rgb.hex(device.state.color.r, device.state.color.g, device.state.color.b);
            var curKelvin = device.state.colorKelvin = ct.rgb2colorTemperature({red: device.state.color.r, green: device.state.color.g, blue: device.state.color.b})

            if (options.color.hex || options.color.hsl || options.color.rgb)
            {
                var newColor = "";
                if (options.color.hsl)
                    newColor = hsl.hex(options.color.hsl);
                else if (options.color.rgb)
                    newColor = rgb.hex(options.color.rgb);
                else if (options.color.hex)
                    newColor = options.color.hex.replace(/#/g, '');

                var running = true;
                var startTime = Date.now();
                setTimeout(() =>
                {
                    running = false;
                    setColor.call(this, {
                        hex: newColor
                    });
                    resolve();
                }, options.time - 100);
                while (running == true)
                {
                    var percent = (Date.now() - startTime) / (options.time - 100);
                    var lerpedColor = lerpColor(curHex, newColor, Math.max(Math.min(percent, 1), 0));

                    // Set color state
                    var newRgb = hex.rgb(lerpedColor);
                    device.state.color.r = newRgb[0];
                    device.state.color.g = newRgb[1];
                    device.state.color.b = newRgb[2];
                    await setColor.call(this, {
                        hex: "#" + lerpedColor
                    });
                    await sleep(10);
                }
            } else if (options.color.kelvin)
            {
                var targetKelvin = parseFloat(options.color.kelvin.toString().replace(/[^0-9]/g, ""));

                var running = true;
                var startTime = Date.now();
                setTimeout(() =>
                {
                    running = false;
                    
                    var kelvinRGB = ct.colorTemperature2rgb(targetKelvin)
                    setColor.call(this, {
                        rgb: [kelvinRGB.red, kelvinRGB.green, kelvinRGB.blue]
                    });
                    device.state.color.r = kelvinRGB.red;
                    device.state.color.g = kelvinRGB.green;
                    device.state.color.b = kelvinRGB.blue;
                    device.state.colorKelvin = targetKelvin
                    resolve();
                }, options.time - 100);
                while (running == true)
                {
                    var percent = (Date.now() - startTime) / (options.time - 100);
                    var lerpedKelvin = lerp(curKelvin, targetKelvin, Math.max(Math.min(percent, 1), 0));
                    console.log(percent, lerpedKelvin, curKelvin, targetKelvin);
                    var kelvinRGB = ct.colorTemperature2rgb(lerpedKelvin)

                    // Set color state
                    device.state.color.r = kelvinRGB.red;
                    device.state.color.g = kelvinRGB.green;
                    device.state.color.b = kelvinRGB.blue;
                    device.state.colorKelvin = targetKelvin

                    await setColor.call(this, {
                        rgb: [kelvinRGB.red, kelvinRGB.green, kelvinRGB.blue]
                    });
                    await sleep(10);
                }
            }
            updateValues(this);
        });

        eventEmitter.once("newStatus", async (device: Device, data: DataResponseStatus) =>
        {
            if (device.deviceID !== this.deviceID) return;

            var curBrightness = device.state.brightness;

            if (options.brightness)
            {
                var running = true;
                var startTime = Date.now();
                var targetBright = options.brightness;
                setTimeout(() =>
                {
                    running = false;
                    setBrightness.call(this, targetBright);
                    resolve();
                }, options.time - 100);
                while (running == true)
                {
                    var percent = (Date.now() - startTime) / (options.time - 100);
                    var newBright = lerp(curBrightness, options.brightness, Math.max(Math.min(percent, 1), 0));
                    device.state.brightness = newBright;
                    await setBrightness.call(this, newBright);
                    await sleep(10);
                }
            }

            resolve();
            updateValues(this);
        });

    });
}

function sleep (ms: number): Promise<void>
{
    return new Promise((resolve, reject) =>
    {
        setTimeout(() =>
        {
            resolve();
        }, ms);
    });
}

export function updateValues (device: Device, updateAll?: boolean)
{
    let message = JSON.stringify(
        {
            "msg": {
                "cmd": "devStatus",
                "data": {}
            }
        }
    );
    if (updateAll)
    {
        device.socket?.send(message, 0, message.length, 4001, device.ip);
    } else
    {
        device.socket?.send(message, 0, message.length, 4001, "239.255.255.250");
    }
}