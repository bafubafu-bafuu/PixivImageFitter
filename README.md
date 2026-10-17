# Pixiv Image Fitter

Pixiv の画像拡大表示を、画面サイズに自動でフィットさせる日本語 UI の Chrome Manifest V3 拡張機能です。外部サーバー、アカウント登録は不要で、表示の調整はすべて端末内で行います。

## できること

- 拡大表示した画像の最大サイズをビューポート（100vw / 100vh）に制限し、`display: block` と `margin: auto` で中央寄せを保ちます。
- 縦横比を保ったまま縮小するため、画面より大きな画像の左右や上下が見切れにくくなります。
- 拡大ビューア自体に `overflow: auto` を付与し、大きな画像でもスクロールで確認できます。
- リンク内のサムネイルや作品プレビューの画像には適用しません。
- 拡大表示を閉じると、付与したスタイルをすべて削除してページ本来の表示に戻します。
- ツールバーのポップアップで ON / OFF を切り替えられます。切り替えはページを再読み込みせず、開いているタブへ即時反映されます。
- 設定は Chrome Sync に保存されます（Chrome の同期を有効にしていれば端末間で共有されます）。

## 動作の仕組み

1. コンテンツスクリプトが www.pixiv.net のページで DOM の変化とウィンドウのリサイズを監視します。
2. pixiv が画像の拡大表示を開くと、ルート要素の `overflow` が `hidden` になります。これを合図に、拡大ビューア内の画像へフィット用のスタイルを `!important` 付きで付与します。
3. 拡大を閉じると、付与したプロパティだけを削除して元に戻します。
4. 変更の検出は `requestAnimationFrame` でまとめて処理し、ページ描画への影響を抑えます。

URL や画像データの収集・送信は行いません。拡張が発生させるリクエストもありません。

## ソースから使う

Node.js 24 系と npm が必要です。

```
npm ci
npm run build
```

1. Chrome の `chrome://extensions` を開く。
2. デベロッパーモードを有効にする。
3. 「パッケージ化されていない拡張機能を読み込む」で `dist` を選択する。

ビルド後にコードを更新したら再ビルドし、拡張機能管理画面から再読み込みしてください。拡張の再読み込み前から開いているページには古いスクリプトが残るため、ページを再読み込みすると新しい内容が反映されます。

## 対象と制約

| 項目 | 動作 |
| --- | --- |
| www.pixiv.net の画像拡大表示 | 画像をビューポートへフィット |
| リンク内・作品プレビュー内の画像 | 対象外（誤適用を防止） |
| 拡大表示を閉じたあと | 付与したスタイルを削除して復元 |
| pixiv.net 以外のページ | 動作しない（`matches` は www.pixiv.net のみ） |
| 画像そのもの | 加工・再取得・高解像度化はしない（表示スタイルのみ変更） |
| pixiv 側の DOM 変更 | セレクタが一致しなくなると動作しなくなる可能性がある |

対象セレクタは `img[style*="z-index"]`、`img[data-testid="illust-zoom-viewer-image"]`、`div[role="presentation"] img` です。フィット処理は `src/content/fit.ts` にまとまっています。

## 権限とデータ

| 権限 | 用途 |
| --- | --- |
| `storage` | ON / OFF 設定の保存（`chrome.storage.sync`） |
| www.pixiv.net へのコンテンツスクリプト | 拡大表示のスタイル調整 |

- 閲覧 URL・ページ内容・画像を収集・送信しません。テレメトリーや広告もありません。
- Chrome Sync を有効にしている場合、設定は Google アカウント経由で同期されます。これは Chrome の機能であり、拡張自身が外部送信するものではありません。詳しくは [PRIVACY.md](./PRIVACY.md) を参照してください。

## 開発と試験

```
npm run typecheck
npm run lint
npm test
npm run test:coverage
npx playwright install chromium
npm run build
npm run test:e2e
npm run test:chrome
npm run package
```

- 単体試験はフィット処理と設定の読み書きを対象にします。
- E2E は専用の一時ブラウザプロファイルで拡張を読み込み、`https://www.pixiv.net/` へのリクエストをテスト内でローカルのフィクスチャへ差し替えます。実際の pixiv へアクセスしません。
- `test:chrome` はインストール済みの Chrome を専用プロファイルで起動します。拡張をテスト用に読み込むための Chrome デバッグ API に対応するバージョンが必要です。通常利用のプロファイルには触れません。
- リリース前には、実際の pixiv で手動確認を行ってください。

## 配布

`npm run package` で配布 ZIP を生成します。配布物の許可リスト、マニフェストと `package.json` のバージョン一致、権限、外部通信コードの混入がないことを検証します。公開操作は自動では実行しません。

[ストア提出ガイド](./docs/STORE.md)、[変更履歴](./CHANGELOG.md)、[コントリビューション](./CONTRIBUTING.md)、[セキュリティ報告](./SECURITY.md)、[第三者ライセンス](./THIRD-PARTY-NOTICES.md)も参照してください。

## 開発者・問い合わせ

開発者：bafubafu-bafuu

連絡先：[bafubafu-bafuu@puripuri.dev](mailto:bafubafu-bafuu@puripuri.dev)

Copyright © 2026 bafubafu-bafuu. MIT License。
