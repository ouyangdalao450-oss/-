# 动了么 Cloudflare Worker 推送后端

这个目录是不用银行卡的备用部署方案，用 Cloudflare Workers + KV 保存手机推送订阅，并用 Cron Trigger 按工作时间自动推送。

## 需要配置的环境变量

在 Cloudflare Worker 的 Settings -> Variables 里添加：

```text
VAPID_PUBLIC_KEY=BPnTvrzLFxjkh1TUHWZkYIoC_zT_bZKHh3QqUMxFpveSiy0xE5hTv9Eh3Gcew-xxKQmP5sm9S2ETFQplk2CdHIs
VAPID_PRIVATE_KEY=0_09b78F1mSWeSEPIbqu2TH4jqZHXa8oUrHqmTUCshE
VAPID_CONTACT_EMAIL=mailto:ouyangdalao450@gmail.com
ALLOWED_ORIGIN=https://ouyangdalao450-oss.github.io
```

## 部署后

Cloudflare 会给一个类似下面的地址：

```text
https://donglema-push-worker.你的账号.workers.dev
```

把这个地址填到根目录 `app.js` 的 `pushServerUrl`，再提交推送到 GitHub Pages。
