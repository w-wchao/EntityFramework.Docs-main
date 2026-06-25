# 登录页面（示例）

这是一个简单的静态登录页面示例，包含响应式样式和基础客户端验证（模拟提交）。

快速预览方法：

1. 直接在文件管理器中双击打开 [login-page/index.html](login-page/index.html)。
2. 推荐在本地静态服务下运行（避免某些浏览器对本地脚本的限制）：

```powershell
# 在项目根目录运行（需要安装 Python）
cd login-page
python -m http.server 8000
# 然后在浏览器打开 http://localhost:8000/
```

使用说明：
- 测试账号：`demo@example.com` / `password`（触发模拟登录成功）
- 将来可把 `script.js` 中的模拟逻辑替换为调用后端 API 的 `fetch` 请求。

后端示例（可选）

项目内包含一个使用 JWT 的 Node/Express 示例，用于本地测试登录/刷新/登出流程：

```powershell
cd login-page
npm install
npm start
# 启动后端示例在 http://localhost:3000 ，页面的 fetch 默认会请求 /api/login（同一主机或通过代理）
```

JWT 认证说明

- 登录 `POST /api/login` 会在响应中返回 `accessToken`，并通过 `Set-Cookie` 设置一个 `HttpOnly` 的 `refreshToken` cookie（同域或启用 CORS credentials 时生效）。
- 客户端应把短期的 `accessToken` 存储在内存或 `localStorage`（演示使用 `localStorage`），并在每次请求受保护 API 时放到 `Authorization: Bearer <token>` 头。
- 当 `accessToken` 过期时，客户端可调用 `POST /api/refresh`（带上 cookie）来换取新的 `accessToken`。
- 登出 `POST /api/logout` 会清除服务器端保存的刷新令牌并清除 cookie。

注意：本示例为了演示把刷新令牌设置为 HttpOnly cookie；在生产环境还需要使用 HTTPS、合理的 SameSite 策略和刷新令牌存储与撤销策略。

撤销与持久化（演示）

- 刷新令牌在示例中持久化到 `refreshTokens.json`，服务器在登录时会将新令牌写入该文件，并在撤销或登出时删除。
- 提供 `POST /api/revoke` 接口用于撤销单个令牌或指定用户的全部令牌（请求示例：`{ "token": "<token>" }` 或 `{ "email": "user@example.com" }`），该接口需要 `x-csrf-token` 头与 CSRF cookie 匹配。

CSRF 保护

- 登录成功后服务器会设置一个非 HttpOnly 的 `csrfToken` cookie，客户端需要在后续会修改服务器状态的请求中把该值放入 `x-csrf-token` 头中。
- 示例中 `/api/refresh`, `/api/logout`, `/api/revoke` 会验证该 header 与 cookie 是否一致以防止 CSRF 攻击。


主题与 UI

- 页面右上角有主题切换按钮，可在浅色/暗色模式之间切换，主题设置会保存在 `localStorage`。
- 密码输入框右侧提供显示/隐藏密码按钮，便于查看输入。

SPA 动画与验证提示

- 在验证失败时输入框会短暂高亮并触发抖动动画，卡片也会抖动以增强反馈。
- 点击登录时按钮显示加载微交互（小圆环），成功后展示覆盖式成功屏并可继续。


