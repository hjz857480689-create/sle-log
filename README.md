# SLE记录簿

基于 PandaAI Mono 设计语言制作的 SLE 疾病管理 App。1.0 数据层使用 Supabase Auth、PostgreSQL 与 Row Level Security。

## 本地预览

```bash
python3 -m http.server 4173
```

浏览器打开 `http://localhost:4173/`。

## Supabase 上线配置

1. 在 Supabase 创建项目（数据库运行在 Supabase 云端，不需要本机持续开机）。
2. 打开 Supabase SQL Editor，执行 `supabase/migrations/202607170001_initial_schema.sql`。
3. 在 Authentication -> Providers 中保持 Email provider 启用，并关闭 Confirm Email。用户界面只使用“用户名 + 密码”；应用会在内部生成不可见的登录标识，不需要手机号、短信或真实邮箱。
4. 从 Project Settings -> API 复制 Project URL 和 publishable/anon key，填写到 `supabase-config.js`。
5. 部署全部静态文件到支持 HTTPS 的站点。不要把 `service_role` key 写入任何前端文件。

正式环境中：

- 登录密码只由 Supabase Auth 保存和校验，不进入应用数据表或备份文件。
- 每位用户的数据保存在 `public.user_app_state` 表的独立一行中。
- RLS 使用 `auth.uid() = user_id` 限制读写，匿名用户没有表权限。
- 浏览器仅保留当前用户的离线缓存；云端 PostgreSQL 是主数据源。

未填写 Supabase 配置时，`localhost` 会自动进入本地演示模式；配置后可用 `http://localhost:4173/?demo=1` 进入隔离演示模式。部署到非本地域名后始终使用 Supabase，避免误把本地原型当作正式服务。

## 已实现范围

- Supabase 用户名密码登录、注册、修改用户名、修改密码、退出和注销流程
- 指标分类、指标切换、参考范围与趋势图
- 同时间范围内的用药阶段对照
- 指标新增、设置、排序、隐藏、编辑和删除
- 批量检查录入与单项快速录入
- 桌面表格与移动卡片两种历史记录形态
- 当前用药、剂量阶段、实际给药、观察记录、药物详情阶梯图和历年时间轴
- 账号资料修改、Supabase 云端同步、JSON 备份恢复、指标 CSV 与用药 CSV 导出
- 删除数据、确认对话框、空状态和表单错误状态
- 新增检查、单项快速录入、自定义指标、添加用药弹窗
- 浅色 / 深色模式，以及 320px 到桌面宽度的响应式布局

Supabase 项目 URL 与 publishable key 填写后即可连接真实身份认证和云数据库。发布前仍需完成真实项目联调、账号找回策略、隐私政策与医疗数据合规审查。由于账号不绑定手机号或邮箱，1.0 不提供自助找回密码；遗忘密码时需要由项目管理员协助处理。

完整设计说明见 [DESIGN-SPEC.md](./DESIGN-SPEC.md)。
