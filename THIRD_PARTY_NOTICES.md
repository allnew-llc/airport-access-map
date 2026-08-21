# Third-party notices

The MIT License in this repository applies to the software authored for Airport Access Map. It does not automatically relicense third-party data, map tiles, organisation names, logos, or linked website content.

## MapLibre GL JS

The deployed JavaScript bundle includes MapLibre GL JS and components listed in its licence file.

- Copyright: © 2023 MapLibre contributors and the other copyright holders identified in the licence
- Licence: BSD 3-Clause and the additional notices reproduced in the licence file
- Full licence text distributed with the application: [`public/licenses/MapLibre-GL-JS-LICENSE.txt`](public/licenses/MapLibre-GL-JS-LICENSE.txt)
- Upstream project: https://github.com/maplibre/maplibre-gl-js

## OpenStreetMap-derived reference routes

`public/data/access-network.geojson` and route geometry represented in `src/national-airport-routes.js` are derived from OpenStreetMap data.

- Copyright: © OpenStreetMap contributors
- Licence: Open Data Commons Open Database License 1.0 (ODbL)
- Copyright and licence information: https://www.openstreetmap.org/copyright
- ODbL text: https://opendatacommons.org/licenses/odbl/1-0/

The routes are static reference geometry. They do not indicate that a transport service is operating or that a road is open.

## Geospatial Information Authority of Japan

The application requests GSI map tiles and font data at runtime. Those resources are not relicensed under this repository's MIT License.

- GSI Tiles list: https://maps.gsi.go.jp/development/ichiran.html
- GSI Content Terms of Use: https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html

Keep the required source attribution and follow the provider's current terms when deploying a modified version.

## Names and links

Airport, railway, bus, road, government and other organisation names are used to identify services and official links. Their appearance does not imply endorsement, certification or partnership. Logos and copied website content are not included in the public source release.

## Fictional sample data

Files under `public/data/sample/` are fictional scenarios authored for UI and regression testing. Real organisation and route names may appear for identification, but the displayed conditions, times, reasons and impacts are not actual operating information.
