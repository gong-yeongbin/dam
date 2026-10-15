import { Navigate, Route, Routes, useLocation } from 'react-router';
import { ProjectProvider } from './auth/project';
import { RequireAuth } from './auth/RequireAuth';
import { AppShell, Placeholder } from './layout/AppShell';
import { ComingSoon } from './layout/PublicLayout';
import { LandingPage } from './pages/landing/LandingPage';
import { EventsPage } from './pages/events/EventsPage';
import { LoginPage } from './pages/login/LoginPage';
import { PricingPage } from './pages/pricing/PricingPage';

// 라우트 표. 화면이 늘 때마다 한 줄씩. 경로가 바뀌면 key가 바뀌어 .page의 페이드인이 다시 돈다
export function App() {
	const { pathname } = useLocation();
	return (
		<div key={pathname} className="page">
			<Routes>
				<Route path="/" element={<LandingPage />} />
				<Route path="/pricing" element={<PricingPage />} />
				<Route path="/developers" element={<ComingSoon title="개발자" />} />
				<Route path="/docs" element={<ComingSoon title="문서" />} />
				<Route path="/login" element={<LoginPage />} />
				<Route element={<RequireAuth />}>
					<Route
						path="/app"
						element={
							<ProjectProvider>
								<AppShell />
							</ProjectProvider>
						}
					>
						<Route index element={<Navigate to="/app/events" replace />} />
						<Route path="events" element={<EventsPage />} />
						<Route path="usage" element={<Placeholder />} />
						<Route path="org" element={<Placeholder />} />
						<Route path="*" element={<Placeholder />} />
					</Route>
				</Route>
			</Routes>
		</div>
	);
}
