# 邮箱密码重置设计

## 目标

为 QuantDesk 的邮箱密码登录增加“忘记密码”流程。用户通过 QQ 邮箱收到一次性链接后设置新密码；重置完成后，既有登录会话全部失效。

## 范围与安全边界

- 使用 QQ SMTP SSL（`smtp.qq.com:465`）发送邮件。
- SMTP 发件地址和授权码仅作为 systemd 环境变量配置在服务器；不得进入前端、Git、数据库明文或日志。
- 请求接口无论邮箱是否存在均返回相同成功文案，避免账号枚举。
- 数据库只保存 reset token 的 SHA-256 哈希、用户 ID、过期时间、使用时间与创建时间；原始 token 仅存在于邮件链接中。
- token 有效期 15 分钟、仅可使用一次。成功重置后删除该用户全部会话，并使旧 token 失效。
- 重设密码继续使用既有 bcrypt 哈希与 10–128 位密码约束。

## 后端接口

1. `POST /api/auth/password-reset/request`
   - 输入：`{ email }`
   - 返回：统一 `202` 响应。
   - 对存在账号生成随机 token，写入哈希记录，发送 `/stock-macro/reset-password?token=...` 链接。

2. `POST /api/auth/password-reset/confirm`
   - 输入：`{ token, password }`
   - 校验 token 哈希、过期时间和一次性状态。
   - 更新密码哈希、标记 token 已使用、撤销用户全部会话。
   - 返回 `204`，用户随后用新密码登录。

## 数据模型

新增 `password_reset_tokens`：

- `token_hash`：主键。
- `user_id`：外键关联用户。
- `expires_at`、`used_at`、`created_at`：ISO 时间。

索引 `user_id` 和 `expires_at`，并在创建/校验时清除过期记录。

## 前端流程

- 登录弹窗增加“忘记密码？”入口。
- 请求页仅输入邮箱并显示统一提交成功提示。
- 重置链接在同一应用中显示新密码与确认密码表单。
- token 无效、过期或已使用时显示安全的通用失败消息；不回显邮箱或 token。

## 验收

- 不存在邮箱与存在邮箱得到相同请求响应。
- token 仅能用一次，过期 token 无法重置。
- 成功重置后旧密码登录失败、新密码登录成功、旧会话失效。
- SMTP 未配置时接口不泄露异常细节，并在服务端日志记录可诊断错误。
- 邮件正文与链接使用部署前缀 `/stock-macro/`。
