# 開発への参加

Node.js 24 系を使用し、`npm ci` で依存を復元してください。

変更前に [README](./README.md) の対象と制約、[SECURITY](./SECURITY.md) の境界を確認してください。

1. 挙動を変える場合は、期待値を明示した正常例・除外例・復元例を単体試験または E2E に追加する。
2. `npm run typecheck`、`npm run lint`、`npm run test:coverage` を実行する。
3. `npm run build` の後に `npm run test:e2e` を実行する。
4. `npm run package` で配布成果物を検証する。
5. 対象ページ・権限・データ利用を変える場合は関連文書も更新する。
6. 利用者に見える変更は [CHANGELOG](./CHANGELOG.md) に追記する。

自動試験で実在する pixiv へアクセスしないでください。E2E はテスト内のフィクスチャのみを使用します。

コミットに秘密情報、個人用のブラウザプロファイル、実際の閲覧 URL、ビルド成果物を含めないでください。
