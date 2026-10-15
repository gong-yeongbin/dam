import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { theme } from './theme';

// 서버 상태는 전부 여기. 창 포커스마다 다시 읽지 않는다(운영 화면은 사용자가 새로고침한다)
const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });

const container = document.getElementById('root');
if (!container) throw new Error('#root 엘리먼트를 찾지 못했다');

createRoot(container).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<ConfigProvider locale={koKR} theme={theme}>
				<BrowserRouter>
					<App />
				</BrowserRouter>
			</ConfigProvider>
		</QueryClientProvider>
	</StrictMode>
);
