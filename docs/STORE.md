# Chrome Web Store 提出ガイド

## 提出時に確認する項目

- 公開リポジトリ URL とプライバシーポリシー URL がストアの掲載情報と一致していること。
- Chrome Web Store 開発者アカウント、必要な本人確認、公開範囲。
- リポジトリの Private Vulnerability Reporting が有効であること。

拡張名は Pixiv Image Fitter、開発者・権利者は bafubafu-bafuu、サポート窓口は bafubafu-bafuu@puripuri.dev です。

## 単一目的の説明

審査承認済みの提出文（このまま使用する）。

English（提出文）:

> This extension automatically resizes images on Pixiv (pixiv.net) image enlargement pages so that they fit perfectly on your screen. It is not used for any other purpose.

日本語（参考訳）: Pixiv（pixiv.net）の画像拡大ページで画像を画面にぴったり収まるよう自動リサイズするための機能。他の目的には使用しない。

## 掲載文（日本語）

### 概要（132 文字以内）

Pixiv の画像拡大表示を画面サイズに自動でフィットさせます。画像の左右や上下が見切れにくくなり、処理は端末内のみで完結します。

### 詳細説明

Pixiv Image Fitter は、Pixiv の作品ページで画像を拡大表示したときに、画像を画面サイズに合わせて表示する拡張機能です。

■ できること
・画面より大きな画像を、縦横比を保ったまま画面内に収めます。
・`margin: auto` による中央寄せを保ち、左右の見切れを抑えます。
・大きな画像はビューアのスクロールで確認できます。
・拡大表示を閉じると、付与したスタイルを削除してページ本来の表示に戻します。
・ツールバーのスイッチで ON / OFF を切り替えられます。切り替えは開いているタブにリロードなしで反映されます。
・設定は Chrome Sync に保存されます。

■ プライバシー
・閲覧 URL・ページ内容・画像を外部へ送信しません。サーバー、アカウント、テレメトリー、広告はありません。
・拡張が発生させる通信はありません。
・動作するのは www.pixiv.net のみです。

■ 権限について
・storage：ON / OFF 設定の保存のみに使用します。
・www.pixiv.net へのコンテンツスクリプト：拡大表示のスタイル調整のみに使用します。

■ ご注意
pixiv 側のページ構造の変更により、動作しなくなる場合があります。画像の再取得や画質の変更は行いません。

対応：Chrome（Manifest V3）。オープンソース（MIT License）。

## Store listing (English)

### Summary (132 characters max)

Fits Pixiv's zoomed image view to your screen. Aspect ratio is preserved, and the page is restored when you close the viewer.

### Detailed description

Pixiv Image Fitter adjusts the zoomed image viewer on Pixiv so that large images fit your screen while keeping their aspect ratio and centering.

■ What it does
- Constrains the zoomed image to the viewport (100vw / 100vh) with `object-fit: contain`.
- Keeps horizontal centering with `margin: auto`, reducing left/right cropping.
- Lets you scroll the viewer to inspect large images.
- Removes the injected styles and restores the page when you close the zoomed view.
- A toolbar switch turns the extension on or off; changes apply to open tabs without reloading.
- The setting is stored in Chrome Sync.

■ Privacy
- No browsing URLs, page content or images are sent anywhere. No server, no account, no telemetry, no ads.
- The extension makes no network requests.
- It only runs on www.pixiv.net.

■ Permissions
- storage: to remember the on/off setting.
- Content script on www.pixiv.net: to adjust the zoomed viewer's styles.

■ Please note
Changes to pixiv's page structure may make the extension stop working. It does not re-fetch images or change their resolution.

Open source under the MIT License. UI language: Japanese.

## 権限理由

審査承認済みの提出文（各項目にこのまま入力する）。

### storage

> The storage permission is required to save the ON/OFF state of the extension. When the user toggles the "Enable Image Resizing" checkbox, this setting is saved in the user's browser. This data is stored locally and is not sent externally.

### ホスト権限（www.pixiv.net）

> Access to pixiv.net is required to automatically resize images on Pixiv's image enlargement pages so that they fit the screen size.

リモートコード、テレメトリー、外部 URL 判定サービスは使用しません。

## 成果物と素材

- `npm run package` で生成した ZIP。秘密鍵・CRX を含めない。
- `public/mdi_resize.png`（Material Design Icons, Apache License 2.0）を 128px アイコンとして使用。帰属表示は THIRD-PARTY-NOTICES.md に、ライセンス全文は配布 ZIP の `licenses/` に同梱。
- スクリーンショットは実在の個人情報を含めず、テスト用フィクスチャで撮影する。提出画面が求める画像サイズ・枚数・プロモーション画像は提出時に確認する。

## 審査用の再現手順

1. 拡張を読み込み、`https://www.pixiv.net/` で任意の作品を開く。
2. 画像をクリックして拡大表示し、画像が画面内に収まり、左右の見切れが抑えられていることを確認できる。
3. ツールバーのスイッチを OFF にし、開いたままのタブの表示が元に戻ることを確認できる。
4. スイッチを ON に戻すと、リロードなしで再適用されることを確認できる。
5. ページを再読み込みしてもスイッチの状態が保持されていることを確認できる。

## リリースゲート

- 型検査、lint、単体試験、E2E、ビルド、ZIP 検証の成功。
- 実 Chrome の現在の安定版で、読み込み・ON / OFF 切替・拡大表示・復元・設定保存を確認。
- 権限の撤回、拡張更新、戻る・進む、別タブ、複数画像、長いページの確認。
- キーボード、明暗テーマ、200% 拡大で主要導線を確認。
- 未解決の重大な不具合や未検証の主要経路があれば公開を保留。
- プライバシー申告、単一目的、権限理由、説明文の保証範囲を実装に合わせる。
- ストア規約と必要素材を提出時に再確認。
