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

<br>

## [Documentation](https://joery.com/govee-lan-control/)
<br>

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

setInterval(() => {
  i++;
  i %= numColors;

  govee.getDevicesArray()[0].actions.setColor({
    rgb: [
      rainbowColors[i].red(),
      rainbowColors[i].green(),
      rainbowColors[i].blue(),
    ],
  });
}, 30);
```
