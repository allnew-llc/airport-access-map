# UX/UIガイドライン適用記録（2026-08-15）

## 参照した一次資料

- デジタル庁デザインシステムβ版 v2.17.0: https://design.digital.go.jp/dads/
- DADS タイポグラフィ: https://design.digital.go.jp/dads/foundations/typography/
- DADS カラー: https://design.digital.go.jp/dads/foundations/color/
- DADS ボタン: https://design.digital.go.jp/dads/components/button/
- DADS 緊急時バナー: https://design.digital.go.jp/dads/components/emergency-banner/
- DADS ランゲージセレクター: https://design.digital.go.jp/dads/components/language-selector/
- 東京都「デジタルサービスに係る行動指針」: https://www.digitalservice.metro.tokyo.lg.jp/business/digital-guideline/
- 東京都ウェブアクセシビリティ方針: https://www.digitalservice.metro.tokyo.lg.jp/accessibility

## このサービスへの適用

| 原則 | 実装 |
| --- | --- |
| 利用者中心・シンプル | ファーストビューを「実ルート地図」「交通状況」「注意情報」「次の行動」の順に固定 |
| 読みやすいタイポグラフィ | 本文16px、交通サマリーはDense用途として14px、本文行高1.5以上を基本化 |
| 操作しやすい大きさ | 主要なボタン、セレクト、開閉操作を44px以上に統一 |
| 色だけに依存しない | 「正常」「遅延・規制」「見合わせ・通行止め」のテキストラベルと左ボーダーを併用 |
| 状態色を適切に使う | 正常は緑、遅延・規制は黄、見合わせ・通行止めは赤に限定。灰色線は状態ではなく参考ルートとして表示 |
| 明確なフォーカス | 黒と黄色の二重フォーカスリングを全操作要素に適用 |
| 多言語を見つけやすく | 右上に常時表示する `Language` セレクターへ集約し、各言語を自言語表記 |
| キーボード操作 | タブUIに左右矢印、Home、Endによる移動とロービングtabindexを追加 |
| レスポンシブ | デスクトップは地図＋サマリーの2カラム、モバイルは地図の直後にサマリーを配置 |
| 警告の簡潔性 | ファーストビューでは最重要事象を1件に絞り、詳細は公式情報リンクへ分離 |

## 実画面での確認結果

- デスクトップ初期画面で、実ルート地図、JR・京成・北総・バス・道路の5区分、最重要の注意、3つの次行動を同時に確認できる。
- モバイル初期画面で、ヘッダー、地図、交通状況サマリーの開始位置までを確認できる。
- 日本語、英語、簡体字、繁体字、韓国語の5言語で横方向のはみ出しがない。
- 本文、主要ボタン、3種類の状態表示、公式情報リンクの文字コントラストはいずれも4.5:1以上。
- 表示上の操作対象は原則44px以上。地図操作ボタンも同じ基準に揃えた。
- キーボードの左右矢印、Home、Endで旅行者タブを切り替えられる。
- 国土地理院の公式実装に合わせ、地図ラベルの文字セット名を `NotoSansCJKjp-Regular` に統一した。
- 自動検証は32件すべて合格。公式ソース、GeoJSON、履歴、実経路の各Gateも合格した。

確認用画像:

- `artifacts/ux-ui-guideline-2026-08-15/desktop-map-summary-1280x720.png`
- `artifacts/ux-ui-guideline-2026-08-15/mobile-map-summary-390x844.png`

## 維持した制約

- 外部交通APIやAI APIをブラウザから直接呼び出さない。
- 状態を確認できない交通機関を正常表示しない。
- 取得失敗・期限切れ等の内部状態は交通状態バッジとして表示せず、公式情報への行動導線へ置き換える。
- 公式情報へのリンク、Evidence Gate、Andon Gate、静的配信構成を変更しない。
