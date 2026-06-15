import { useState } from 'react';
import { App as AntApp, Button, Form, Input } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { api } from '../api';
import { useAuth } from '../auth-context';
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
      message.success('Dang nhap thanh cong');
    } catch (error: unknown) {
      message.error(extractApiErrorMessage(error, 'Dang nhap that bai'));
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-panel">
        <div className="login-brand">
          <div className="login-mark">KA</div>
          <div>
            <div className="login-title">KA MART POS</div>
            <div className="login-subtitle">Dang nhap he thong</div>
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
            label="Tai khoan"
            rules={[{ required: true, message: 'Nhap tai khoan' }]}
          >
            <Input
              autoFocus
              prefix={<UserOutlined />}
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mat khau"
            rules={[{ required: true, message: 'Nhap mat khau' }]}
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
            Dang nhap
          </Button>
        </Form>
      </div>
    </div>
  );
}
