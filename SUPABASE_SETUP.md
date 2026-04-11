# Supabase 設定ガイド

ProxyChecker Web を完全無料で運用するために、Supabaseの無料枠を使用します。

## 1. プロジェクトの作成
1. [Supabase](https://supabase.com/) にアクセスし、アカウントを作成・ログインします。
2. ダッシュボードから「New Project」をクリックします。
3. Organization（任意の名前）、Name（`proxy-checker`等）、Database Password（推測されにくいものを自動生成）を設定し、Regionを近い場所（例: Tokyo）にして「Create new project」をクリックします。
   - ※ 無料枠の範囲内で作成されます。数分でデータベースが構築されます。

## 2. APIキーの取得
プロジェクトの構築が完了したら、ダッシュボード左側の「Project Settings（歯車アイコン）」＞「API」を開きます。
1. **Project URL**: `https://xxxxxx.supabase.co` というURLをコピーします。
2. **Project API keys (anon / public)**: `ey...` で始まる長いキーをコピーします。

## 3. 環境変数の設定
ローカルでテストするため、Next.jsプロジェクトのルートディレクトリ（`proxy-checker-web/.env.local`）を作成し、先ほど取得した値を貼り付けます。

```env
NEXT_PUBLIC_SUPABASE_URL=https://あなたのURL.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=あなたのpublishableキー
SUPABASE_SECRET_KEY=あなたのsecretキー
```

## 4. テーブルの作成（SQL）
ダッシュボード左側の「SQL Editor」を開き、「New Query」を作成して以下のSQLを貼り付け、画面右下の「Run（実行）」をクリックします。

```sql
-- proxies テーブルの作成
create table if not exists proxies (
  id text primary key, -- "ip:port" 形式
  ip text not null,
  port integer not null,
  protocol text not null, -- http, socks4, socks5 のいずれか
  speed_ms integer, -- 応答速度 (ミリ秒)
  is_valid boolean default false,
  is_google boolean default false,
  country_code text,
  country_name text,
  asn text,
  organization text,
  checked_at timestamptz default now()
);

-- 公開Webからは読み取りのみを許可する
alter table proxies enable row level security;
create policy "Allow public read proxies" on proxies for select to public using (true);
```

---
**以上の設定が終わると、データベースの準備は完了です。**
