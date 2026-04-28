# Proxy Checker (new)

Pythonリファレンス実装と同等の検出率を狙った、シンプルで責任分離されたチェッカー。

## 設計思想

- **Python互換のテストロジック**：3 URL を**順次** try、最初の成功で break、例外は黙って次へ
- **速度は並列度で稼ぐ**（個別プロキシ内では並列化しない）
- **ハング対策は runner レイヤーの hard timeout のみ**（テスター内では一切やらない）
- **責任分離**：fetch / test / geo / upload / orchestrate を別ファイルに

## ファイル構成

| ファイル | 責任 |
|---------|------|
| `index.ts` | エントリポイント（配線のみ） |
| `config.ts` | 定数 + 環境変数 |
| `types.ts` | 型定義 |
| `proxyUtils.ts` | 純粋関数（正規化、IP判定） |
| `fetcher.ts` | プロキシリストダウンロード |
| `tester.ts` | **コア**：単一プロキシテスト |
| `geo.ts` | ジオ情報取得＋キャッシュ |
| `uploader.ts` | Supabase upsert/delete |
| `runner.ts` | サイクルオーケストレーション |

## 使い方

```bash
# 1. 依存関係インストール
npm install

# 2. .env.local を作成（local版から流用可）
#    SUPABASE_URL=...
#    SUPABASE_SECRET_KEY=...
#    CHECKER_CONTINUOUS=true  # 連続モードで実行する場合

# 3. ビルド
npm run build

# 4. 実行
npm start
# または直接
npm run dev
```

`.env.local` は `local/.env.local` をコピーしてください。

## チューニングポイント

`config.ts` に集約：

- `URL_TIMEOUT_MS` (8000) - URL あたりタイムアウト
- `GOOGLE_TIMEOUT_MS` (6000) - Google チェック専用
- `PER_PROXY_HARD_LIMIT_MS` (30000) - プロキシあたり絶対上限
- `CONCURRENCY` (500) - 同時テスト数
- `UPLOAD_BATCH_SIZE` (50) - Supabase upsert バッチサイズ
