# Govee LAN API

Someone will probably make this better than I ever could, but I wan't to abandon
Govee's API that uses their servers, since I don't like it.

## What is this?

An npm module to control Govee devices using their new
[LAN API](https://twitter.com/GoveeOfficial/status/1557538932560039936).

## What devices are supported?

Check
[Govee's WLAN Guide](<https://app-h5.govee.com/user-manual/wlan-guide#:~:text=Supported%20Product%20Models%20(continually%20updated)>),
they have a list.

<br>

## [Documentation](https://joery.com/govee-lan-control/)

<br>

## Note for Docker users:
UDP ports 4001, 4002 and 4003 are used on address 239.255.255.250. If you only allow certain IP addresses, also add the ip of your device directly.

Use these flag to allow for the correct ports to be accessed.
```
-p 4001:4001/udp -p 4002:4002/udp -p 4003:4003/udp
```
Also if you have a firewall inside of your container, make sure it allows requests going to remote port 4001 and 4003, and it allows requests comming in on local port 4002.

Here is an example of how to allow outgoing requests on port 4001 and 4003 (This is for Red Hat / Centos, check with the firewall on your distro)
```
sudo iptables -A INPUT -p udp --dport 4001 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 4003 -j ACCEPT
```

<br>

## Examples

For Node_RED examples, check the [examples folder](https://github.com/Joery-M/Govee-LAN-Control/tree/master/examples)
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
  govee.devicesArray[0].actions.fadeColor({
    time: 2000,
    color: {
      hex: Math.floor(Math.random() * 16777215).toString(16),
    },
    brightness: Math.random() * 100,
  });
}, 2000);
```

### Rainbow

```js
var i = 0;

setInterval(() => {
  i++;
  // Loop back to 0 when at 360
  i %= 360;

  govee.devicesArray[0].actions.setColor({
    hsl: [i, 100, 50],
  });
}, 30);
```
