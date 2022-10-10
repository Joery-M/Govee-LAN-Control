import { Device } from "..";

export function setOff (this: Device): Promise<void>
{
    var device = this;
    return new Promise((resolve, reject) =>
    {
        let message = JSON.stringify(
            {
                msg: {
                    cmd: "turn",
                    data: {
                        value: 0
                    }
                }
            }
        );
        device.socket?.send(message, 0, message.length, 4001, device.ip, () =>
        {
            device.updateValues();
            device.state.isOn = 0;
            resolve();
        });
    });
}

/**
 * @description
 * Turn on a light.
 */
export function setOn (this: Device): Promise<void>
{
    var device = this;
    return new Promise((resolve, reject) =>
    {
        let message = JSON.stringify(
            {
                msg: {
                    cmd: "turn",
                    data: {
                        value: 1
                    }
                }
            }
        );
        device.socket?.send(message, 0, message.length, 4001, device.ip, () =>
        {
            device.updateValues();
            device.state.isOn = 1;
            resolve();
        });
    });
}