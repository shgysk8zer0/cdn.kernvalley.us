# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- markdownlint-disable -->
## [Unreleased]

### Added
- `<share-button>` now supports an optional `file`
- Provide minified (Rollup) version of certain custom elements
- `<leaflet-map>` now dispatches `"zoom"` and `"pan"` events
- New `WeakMap` for storing zoom handlers
- Add `minZoom` & `maxZoom` to marker comstructor
- On `minzoom` or `maxzoom` change, toggle map zoom listener

### Changed
- Use `WeakMap` for storing maps from elements to markers

## [v1.0.13] - 2020-12-17

### Added
- `ga('send', ...)` on ad view or click
- Create `<svg-box>` element for using SVGBox icons
- `<button is="app-list">` component for listing KernValley.US Apps

### Changed
- Google Analytics `importGa()` now returns `{ ga, gtag }`
- Copy `<weather-*>` components to `/components/weather/`
- Update lazy loading of `<spotify-player>` and `<youtube-player>`
- Use Adwaita theme
- Update `<leaflet-*>` constructors for easier JS creation
- Update `navigator.share()` based on [Share Target API](https://web.dev/web-share-target/)
- `<button is="share-button">` changes to work with new `navigator.share()`

### Fixed
- Fix handling of `vibrate` in `HTMLNotificationElement`
- Correct custom property usage in `<pwa-prompt>` button styles

## [v1.0.12] - 2020-10-24

### Added
- Create `<table is="cache-list">` component
- Add rtl support for `<ad-block>`
- Add image only layout for `<ad-block>`
- Add link to ads site at bottom of `<ad-block>`s
- Add install event resporting to `window.ga()` if available
- `<ad-block>` can now navigate to internal URLs instead of opening new tab
- `<ad-block url="...">` now handles UTM params
- Create basic script for resetting web app data `/js/pwa-reset.js`
- Add `<ad-block media="...">` support using `matchMedia()`
- Implement lazy-loading of components
- Enable setting colors, background, and border in `<ad-block>`s via attributes
- `<form is="share-target">` inputs now dispatch `"change"` and `"input"` events
- `<form is="share-target">` has attribute `clearurlparams` to clear out GET params from URL
- `<ad-block>` file methods

### Changed
- Support lazy loading of `<leaflet-map>`, `<ad-block>`, and `<github-user>`

### Fixed
- Improve accessibility of `<ad-block>`s (contrast, keyboard navigation)
- Fix parsing of params in `<form is="share-target">`
- Fixed typo in setting `"utm_source"` params in share buttons

## [v1.0.11] - 2020-10-02

### Added
- Postioning and fit settings for `<ad-block>` images
- Different layouts for `<ad-block>` (card, stack, text)

### Changed
- Update Leaflet to [v1.7.1](https://leafletjs.com/2020/09/04/leaflet-1.7.1.html)
- Make more use of `crossorigin="anonymous"` and `referrerpolicy="no-referrer"`

### Fixed
- `<ad-block>` replacement layout issues

## [v1.0.10] - 2020-08-28

### Added
- `<button is="print-button">` custom element
- `<permissions-switch>` element for handling permission changes and requests
- `<button is="register-protocol-handler">` component
- `<html-notification>`, a custom element modelled after the `Notification` API
- Provide support for `badge`, `actions`, `image`, and `timestamp` in `<html-notification>`
- `<html-popup>` component

### Changed
- Add support for `HTMLNotificationElement.vibrate` and `HTMLNotificationElement.silent`
- Set default referrer policies on imported templates and stylesheets

### Fixed
- Fix share button show method [#239](https://github.com/shgysk8zer0/cdn.kernvalley.us/issues/239)

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
