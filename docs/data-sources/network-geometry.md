# 道路・鉄道の路線形状データ

地図上の道路・鉄道路線は、OpenStreetMap の道路・鉄道中心線を Overpass API の `out geom` で取得し、`public/data/access-network.geojson` に静的保存しています。

- 表示対象: JR総武本線・成田線、京成本線、北総線、成田スカイアクセス、東関東道E51、圏央道C4、国道51号、国道295号
- データ用途: 路線の位置を示す背景情報のみ
- 安全境界: 路線色は事業者・路線種別を示し、運行・通行・安全状態を示しません
- 更新方法: `npm run network:update`
- 検証方法: `npm run validate:network`
- 取得失敗時: 候補ファイルへ出力する前に停止し、直前の正常なGeoJSONを維持します

## ライセンス

Map data © OpenStreetMap contributors. OpenStreetMap data is available under the Open Database License (ODbL) 1.0.

- Copyright and attribution: https://www.openstreetmap.org/copyright
- ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/

国土交通省の国土数値情報「鉄道（N02）」も候補として確認しましたが、公開ページ上の最新データ基準年度が2022年度であるため、本MVPの静的路線形状には上記のOSMスナップショットを使用しています。
