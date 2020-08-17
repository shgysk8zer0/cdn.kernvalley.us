# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- markdownlint-disable -->
## [Unreleased]

### Added
- `<button is="register-protocol-handler">` component
- `<html-notification>`, a custom element modelled after the `Notification` API
- Provide support for `badge`, `actions`, `image`, and `timestamp` in `<html-notification>`
- `<html-popup>` component

### Changed
- Add support for `HTMLNotificationElement.vibrate` and `HTMLNotificationElement.silent`
- Set default referrer policies on imported templates and stylesheets

## [v1.0.9] - 2020-07-28

### Added
- `<audio is="audio-player">`, implementing the `navigator.mediaSession` API where supported

### Changed
- Improve `HTMLCustomElement` slot handling
- Rewrite assigning `<iframe>` player to `<spotify-player>`

## [v1.0.8] - 2020-07-24

### Added
- `<slot name="toolbar">` to `<leaflet-map>`
- `<form is="share-target">` for handling shares using the Share Trarget API

### Fixed
- Properly handle parsing share target params [#207](https://github.com/shgysk8zer0/cdn.kernvalley.us/issues/207)

## [v1.0.7] - 2020-07-20

### Fixed
- Delegate `beforeinstallprompt` event handling to `<pwa-prompt>` and `event.prompt()` on install button click
- Do not set `referrer`, etc. by default when `fetch`ing templates, instead default to `undefined`
- Fix accessibility for `<share-to-button>` [#194](https://github.com/shgysk8zer0/cdn.kernvalley.us/issues/194)

### Changed
- Add support for `<template>`s for `<leaflet-marker>` popups

## [v1.0.6] - 2020-07-17

### Changed
- Indent `switch` / `case` rule for eslint
- Update `.editorconfig` to specify tab style and width
- Run `npm run fix` with new linting rules
- Update submodules
- Rename stylelint config file

## [v1.0.5] - 2020-07-10

### Added
- `<time is="...">` components for formatting dates

### Changed
- Make use of `ParentNode.replaceChildren()` instead of `Element.remove()` and `Element.append()`
- Enhance `<match-media>` with events and ability to change `media` correctly

### Removed
- Misc. classes for old map element

## [v1.0.4] - 2020-06-29

### Added
- Default assignees to issues

### Changed
- Popup (`[slot="popup"]`) in `<leaflet-map>`s now have `part="popup"` appended
- Add fullscreen support for `<leaflet-map>` [#170](https://github.com/shgysk8zer0/cdn.kernvalley.us/issues/170)
- Dependency updates

### Fixes
- Overflow issue of `<leaflet-map>` images

## [v1.0.3] - 2020-06-27

### Added
- GitHub Actions updater for Dependabot
- Dependabot status badge

### Changed
- Update to Dependabot v2 syntax
- Numerous dependency updates
- `eslint` config (use 2019 modules)

### Removed
- Old Dependabot config directory
- All `babel` plugins

## [v1.0.2] 2020-06-25

### Added
- Dependabot config

## [v1.0.1] 2020-06-24

### Fixed
- `<river-flows>` -> `<river-levels>` to match script src

### Added
- Add `HTMLCustomElement.register()` for safer custom element registration

### Changed
- `<share-to-button>` registration now avoids throwing on duplicate registration

## [v1.0.0] 2020-06-23

### Added
- Add `<river-levels>`
- Implement Super Linter
- Add CHANGELOG

### Changed
- Update README with badges

### Removed
- Remove Travis-CI config
<!-- markdownlint-restore -->
