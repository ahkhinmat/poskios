import { useState } from 'react';
import { App as AntApp, Button, Form, Input } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { api } from '../api';
import { useAuth } from '../auth-context';
import { LANG } from '../lang';
import { extractApiErrorMessage } from '../utils/error';
import type { ApiEnvelope, LoginResponse } from '../types';

export function LoginPage() {
  const { message } = AntApp.useApp();
  const { handleLoginResponse } = useAuth();
  const [loggingIn, setLoggingIn] = useState(false);

  async function handleLogin(values: { username: string; password: string }) {
    setLoggingIn(true);

    try {
      const response = await api.post<ApiEnvelope<LoginResponse>>(
        '/auth/login',
        {
          username: values.username.trim(),
          password: values.password,
        },
      );

      handleLoginResponse(response.data.data);
      message.success(LANG.loginSuccess);
    } catch (error: unknown) {
      message.error(extractApiErrorMessage(error, LANG.loginFailed));
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-panel">
        <div className="login-brand">
          <div className="login-mark">{LANG.loginMark}</div>
          <div>
            <div className="login-title">{LANG.loginTitle}</div>
            <div className="login-subtitle">{LANG.loginSubtitle}</div>
          </div>
        </div>

        <Form
          layout="vertical"
          className="login-form"
          onFinish={(values) =>
            void handleLogin(values as { username: string; password: string })
          }
        >
          <Form.Item
            name="username"
            label={LANG.loginUsernameLabel}
            rules={[{ required: true, message: LANG.loginUsernameRequired }]}
          >
            <Input
              autoFocus
              prefix={<UserOutlined />}
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={LANG.loginPasswordLabel}
            rules={[{ required: true, message: LANG.loginPasswordRequired }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              autoComplete="current-password"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loggingIn}
            className="login-submit"
          >
            {LANG.loginButton}
          </Button>
        </Form>
      </div>
    </div>
  );
}
