# 动了么 Push Server

这个后端用于真正的锁屏/后台 Web Push：

- 前端 PWA 保存 iPhone 的 Push Subscription。
- 后端常驻运行，每分钟检查订阅用户的工作时间。
- 到点后，即使手机锁屏、PWA 不在前台，也由后端向 iPhone 推送提醒语。

## 本地运行

```bash
cd server
npm install
npm run keys
```

把输出的 `VAPID_PUBLIC_KEY` 和 `VAPID_PRIVATE_KEY` 配到环境变量，然后运行：

```bash
npm start
```

## Render 部署建议

1. 在 Render 新建 `Web Service`，连接这个 GitHub 仓库。
2. Root Directory 填 `server`。
3. Build Command 填 `npm install`。
4. Start Command 填 `npm start`。
5. Environment Variables 设置：
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_CONTACT_EMAIL=mailto:你的邮箱`
   - `ALLOWED_ORIGIN=https://ouyangdalao450-oss.github.io`

部署完成后，把 Render 的服务地址填回前端 `app.js` 里的 `pushServerUrl`。
