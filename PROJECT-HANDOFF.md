# SLE记录簿项目交接

## 项目位置

- 正式网站：https://jade-kashata-49e0d2.netlify.app
- 后端：Supabase 项目 `gorthhtsrkhbmhwjmqmi`
- 主数据表：`public.user_app_state`
- 用户资料表：`public.profiles`

## 在新电脑本地运行

1. 下载或克隆完整项目源码。
2. 在项目目录打开终端。
3. 运行：`python3 -m http.server 4173`
4. 浏览器打开：`http://localhost:4173/?demo=1`

`?demo=1` 是隔离的本地演示模式，不会修改正式用户数据。去掉该参数后会连接正式 Supabase。

## 正式发布

1. 确认 `index.html`、`styles.css`、`app.js`、`controls.js`、`features.js`、`supabase-client.js`、`supabase-config.js` 已更新。
2. 将这些文件和 `_headers` 放在同一个发布目录中。
3. 压缩发布目录。
4. 将 ZIP 拖入 Netlify 项目的 `Production deploys` 区域。
5. 打开正式网址进行注册、登录、移动端和云端同步测试。

## 安全边界

- `supabase-config.js` 只能存放 Project URL 和 Publishable Key。
- 不要提交数据库密码、`service_role` key、个人账号密码或真实健康数据。
- 数据库密码只保存在 Supabase，不需要写入本项目。
- 数据库结构变更统一保存在 `supabase/migrations/`。

## 账号方式

- 用户界面使用“用户名 + 密码”。
- 不要求真实邮箱或手机号。
- Supabase 内部使用由用户名生成的不可见认证标识。
