# Changelog

All notable changes to this project will be documented in this file.

## [2.1.0] - 2022-11-20

### Added

- Changelog (about time)
- Event types for all EventEmitter functions
- Debugging script called `dgramTest.js`, run it if you run in to issues with creating the socket.

### Fixed

- Ready event not being fired (Thanks [koningcool](https://github.com/Joery-M/Govee-LAN-Control/issues/2))
- Having to have a `Device Added` node in Node-red for the `Govee` instance to be created.
- `Set Color` node had a link to a documentation that was broken

### Changed

- `Govee.discover()` is no longer async since it didn't have to.
- The single paramater for `new Govee(param)` to be an object which will be able to 

## [2.0.1] - 2022-10-10

### Added

- `node-red` keyword to `package.json` so I can upload it.

## [2.0.0] - 2022-10-10

### Added

- Node-RED support
- Links to [documentation](https://joery.com/govee-lan-control/)
- Descriptions for device actions
- Govee constructor option to disable discover on create

### Fixed

- Event type definitions now also work for `once`

## [1.1.0] - 2022-9-28

### Added

- Color temperature (Kelvin) support
- MIT License

### Changed

- Display name in package.json
- Fade command interval from 50ms to 10ms
- Readme.md

### Removed

- Device `setColorTemp` is now part of `setColor`

### Fixed

- Formatting

## [1.0.0] - 2022-9-27

- Initial release