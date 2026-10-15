import { ApiOutlined, CloudServerOutlined, InboxOutlined, LinkOutlined, MenuFoldOutlined, MenuUnfoldOutlined, PlusOutlined, SendOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Dropdown, Form, Input, Layout, Menu, Modal, Select, Tooltip, Typography, message } from 'antd';
import type React from 'react';
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useProject } from '@/auth/project';
import { clearToken } from '@/auth/token';
import { errorMessage } from '@/api/client';
import { colors } from '@/theme';

const { Text } = Typography;

// 사이드바 메뉴. 경로가 곧 key다. 접으면 아이콘만 남는다
const MENU: ({ key: string; label: string; icon: React.ReactNode } | { type: 'divider' })[] = [
	{ key: '/app/events', label: '이벤트', icon: <InboxOutlined /> },
	{ key: '/app/deliveries', label: '전달', icon: <SendOutlined /> },
	{ key: '/app/connections', label: '연결', icon: <LinkOutlined /> },
	{ key: '/app/sources', label: '소스', icon: <ApiOutlined /> },
	{ key: '/app/destinations', label: '목적지', icon: <CloudServerOutlined /> },
	{ type: 'divider' },
	{ key: '/app/settings', label: '설정', icon: <SettingOutlined /> },
];

// 접힘 상태는 이 브라우저에서만 기억한다
const COLLAPSED_KEY = 'relaydam.sidebar.collapsed';
const readCollapsed = () => {
	try {
		return localStorage.getItem(COLLAPSED_KEY) === '1';
	} catch {
		return false;
	}
};

// 대시보드 공통 틀. 상단 바 없이 왼쪽 사이드바 하나. 계정은 사이드바 맨 아래. 내용은 전폭(표가 많다)
export function AppShell() {
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const [creating, setCreating] = useState(false);
	const [name, setName] = useState('');
	const [saving, setSaving] = useState(false);
	const project = useProject();
	const submit = async () => {
		const orgId = project.current?.org.id ?? project.orgs[0]?.id;
		if (!orgId || !name.trim()) return;
		setSaving(true);
		try {
			await project.create(orgId, name.trim());
			setCreating(false);
			setName('');
		} catch (error) {
			void message.error(errorMessage(error));
		} finally {
			setSaving(false);
		}
	};
	const [collapsed, setCollapsed] = useState(readCollapsed);
	const toggle = () => {
		setCollapsed(!collapsed);
		try {
			localStorage.setItem(COLLAPSED_KEY, collapsed ? '0' : '1');
		} catch {
			// 저장 못 해도 동작엔 지장 없다
		}
	};

	const logout = () => {
		clearToken();
		void navigate('/login', { replace: true });
	};

	return (
		<Layout style={{ minHeight: '100vh' }}>
			<Layout.Sider width={208} collapsedWidth={64} collapsed={collapsed} trigger={null} style={{ background: colors.bg }}>
				<div style={{ padding: collapsed ? '12px 0 8px' : '12px 12px 12px 8px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 4 }}>
					<Tooltip title={collapsed ? '메뉴 펼치기' : '메뉴 접기'} placement="right">
						<Button type="text" aria-label={collapsed ? '메뉴 펼치기' : '메뉴 접기'} icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={toggle} />
					</Tooltip>
					{!collapsed && (
						<Link to="/app" style={{ color: colors.ink, fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>
							relaydam
						</Link>
					)}
				</div>
				{/* 프로젝트 전환. 목록·생성은 API를 붙일 때 채운다. 접으면 숨긴다 */}
				<div style={{ padding: '0 16px 16px', display: collapsed ? 'none' : 'block' }}>
					<Select
						aria-label="프로젝트"
						loading={project.loading}
						value={project.current?.id}
						placeholder="프로젝트"
						options={[
							...project.projects.map((p) => ({ value: p.id, label: p.name })),
							{
								value: 'new',
								label: (
									<span style={{ color: colors.accent }}>
										<PlusOutlined style={{ marginRight: 6 }} />새 프로젝트
									</span>
								),
							},
						]}
						onChange={(value: number | 'new') => (value === 'new' ? setCreating(true) : project.select(value))}
						style={{ width: '100%' }}
					/>
				</div>
				<Modal title="새 프로젝트" open={creating} onCancel={() => setCreating(false)} onOk={() => void submit()} okText="만들기" cancelText="취소" confirmLoading={saving} okButtonProps={{ disabled: !name.trim() }}>
					<Form layout="vertical" onFinish={() => void submit()}>
						<Form.Item label="이름" required>
							<Input placeholder="예: shop" value={name} onChange={(e) => setName(e.target.value)} />
						</Form.Item>
					</Form>
				</Modal>
				<Menu
					mode="inline"
					selectedKeys={[pathname]}
					inlineCollapsed={collapsed}
					items={MENU.map((item) =>
						'key' in item
							? {
									...item,
									label: (
										<Link to={item.key} style={{ fontWeight: pathname === item.key ? 600 : 500 }}>
											{item.label}
										</Link>
									),
								}
							: item
					)}
					style={{ borderInlineEnd: 0, background: 'transparent', flex: 1 }}
				/>
				{/* 계정. 사이드바 맨 아래 */}
				<Dropdown menu={{ items: [{ key: 'logout', label: '로그아웃', onClick: logout }] }} trigger={['click']} placement="topLeft">
					<button type="button" aria-label="내 계정" style={{ margin: 8, padding: collapsed ? 10 : '10px 12px', background: 'none', border: 0, borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10, textAlign: 'left' }}>
						<Avatar size={28} icon={<UserOutlined />} />
						{!collapsed && <Text style={{ fontSize: 14, color: colors.ink }}>내 계정</Text>}
					</button>
				</Dropdown>
			</Layout.Sider>

			<Layout.Content style={{ background: '#fff', padding: 32 }}>
				<Outlet />
			</Layout.Content>
		</Layout>
	);
}

// 아직 안 만든 화면 자리
export function Placeholder() {
	return <Text type="secondary">준비 중</Text>;
}
