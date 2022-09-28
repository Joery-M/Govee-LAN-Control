# Govee LAN API

Someone will probably make this better than I ever could, but I wan't to abandon
Govee's API that uses their servers, since I don't like it.

## What is this?

An npm module to control Govee devices using their new
[LAN API](https://twitter.com/GoveeOfficial/status/1557538932560039936).

## What devices are supported?

Check
[Govee's WLAN Guide](<https://app-h5.govee.com/user-manual/wlan-guide#:~:text=on%20their%20smartphones.-,Supported%20Models,-(continually%20updated)%3A%20H619Z>),
they have a list.

## Examples

### Initial setup

```js
const Govee = require("govee-lan-control");

var govee = new Govee.default();
govee.on("ready", () => {
	console.log("Server/client is ready!");
});
govee.on("deviceAdded", (device) => {
	console.log("New Device!", device.model);
});
```

### Fade to random color and brightness every 2 seconds.

```js
setInterval(() => {
	govee.getDevicesArray()[0].actions.fadeColor({
		time: 2000,
		color: {
			hex: Math.floor(Math.random() * 16777215).toString(16),
		},
		brightness: Math.random() * 100,
	});
}, 2000);
```

### Rainbow (Requires [color-rainbow](https://www.npmjs.com/package/color-rainbow) for this example)

```js
const rainbow = require("color-rainbow");

var numColors = 50;
var rainbowColors = rainbow.create(numColors);
var i = 0;

while (true) {
	var startTime = Date.now();
	i++;
	i %= numColors;

	govee.getDevicesArray()[0].actions.setRGB({
		rgb: [
			rainbowColors[i].red(),
			rainbowColors[i].green(),
			rainbowColors[i].blue(),
		],
	});
	await sleep(30 - (Date.now() - startTime));
}
```

## Events

| Event         | Description                                                            |
| ------------- | ---------------------------------------------------------------------- |
| `ready`       | Gets run when the server/client is ready                               |
| `deviceAdded` | Gets run when a device is found.<br>(For now this includes duplicates) |
| `newStatus`   | Gets run when a device updates its color status                        |

## Possible light commands

| Command                  | Usage                                       |
| ------------------------ | ------------------------------------------- |
| Turn on                  | `Device.actions.turnOn();`                  |
| Turn off                 | `Device.actions.turnOff();`                 |
| Set Color                | `Device.actions.setColor(color);`           |
| Set Brightness           | `Device.actions.setBrightness(brightness);` |
| Fade to brightness/color | `Device.actions.fadeColor(fadeOptions);`    |

## Options for color parameter

(I suck at Typescript, so just use one at a time.)

```ts
{
    hex: string,
    rgb: [number, number, number],
    hsl: [number, number, number],
    kelvin: string | number
}
```
