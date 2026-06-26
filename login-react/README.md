# Login React

最小 Vite + React 登录示例。

运行：

```powershell
cd d:\TEST\EntityFramework.Docs-main\login-react
npm install
npm run dev
```

页面会在 `http://localhost:5173` 启动。后端可使用 `../login-page/server.js` 示例（或同域代理）。

验证与国际化

- 该示例使用 `yup` 做表单 schema 验证（已添加到 `package.json`）。
- 支持中/英文提示，可在页面右上角切换语言查看不同提示文本。

JWT 流程说明

- 前端在登录时会把请求以 `credentials: 'include'` 发送，以便服务器设置 `HttpOnly` 的刷新令牌 cookie。
- 成功登录后服务器返回 `accessToken`（短期），前端会将其存储于 `localStorage`（演示用途）。
- 当 `accessToken` 过期，前端会尝试调用 `POST /api/refresh`（包含 cookie）以换取新的 `accessToken`。
- 页面提供“访问受保护接口”和“登出”按钮用于测试 protected route 与注销流程。


