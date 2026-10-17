# セキュリティ

この拡張は Pixiv の画像表示を端末内で調整する補助ツールです。ページへ付与するスタイルは限定的で、外部との通信は行いません。詳しい対象範囲は [README](./README.md) を参照してください。

## 問題の報告

脆弱性は GitHub の Private Vulnerability Reporting から非公開で報告してください。

一般的な不具合は、GitHub の issue または [bafubafu-bafuu@puripuri.dev](mailto:bafubafu-bafuu@puripuri.dev) へ、再現手順・Chrome のバージョン・拡張のバージョンを添えて報告してください。

## 開発時の境界

- ページ由来の DOM と属性は未検証の入力として扱う。
- コンテンツスクリプトに外部通信・動的コード実行・ページ内容の送信を追加しない。
- 付与するスタイルは `src/content/fit.ts` の定義に限定し、`!important` の適用範囲を広げない。
- 保存する設定は ON / OFF の真偽値のみとし、URL・閲覧情報を保存しない。
- 権限・通信・保存データを増やす変更は、プライバシーポリシーとストア提出文書を同時にレビューする。
