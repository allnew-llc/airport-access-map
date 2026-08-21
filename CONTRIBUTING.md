# Contributing

Airport Access MapへのIssueとPull Requestを歓迎します。

## 開発を始める

```bash
npm ci
npm run sample:generate
VITE_SAMPLE_DEMO=true VITE_PUBLIC_BASE=/ npm run dev
```

提出前に次を実行してください。

```bash
npm run verify:oss
```

## Pull Requestに必要な情報

- 変更する利用者の課題
- 変更前後で可能になる操作
- 確認した空港と画面幅
- テスト結果
- 新しいデータや画像を追加する場合は、その出典とライセンス

## データ追加のルール

- 実際の運行情報や公式ページ本文をコピーしないでください。
- 架空データには`sample_data: true`、`fictional: true`、`not_for_travel_decisions: true`を付けてください。
- 交通状態を推測で補完しないでください。
- APIキー、Cookie、取得キャッシュ、個人情報をコミットしないでください。
- 新しい情報源は、公式URLと再利用根拠を分けて記録してください。

## UI変更のルール

- 390×844pxを最小の基準画面として確認してください。
- 色だけで状態や交通種別を区別しないでください。
- タップ対象は原則44px以上を維持してください。
- 日本語だけでなく5言語の折返しと操作名を確認してください。

## セキュリティ

脆弱性は公開Issueへ記載せず、[SECURITY.md](SECURITY.md)の連絡先を利用してください。
