import { server } from './msw';

// 모든 테스트가 같은 가짜 백엔드를 쓴다. 핸들러에 없는 요청은 오류로 잡는다
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// jsdom에는 matchMedia가 없다. antd의 Grid(Row·Col)가 화면 폭을 읽을 때 쓴다
window.matchMedia ??= (query: string) =>
	({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => undefined,
		removeListener: () => undefined,
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
		dispatchEvent: () => false,
	}) as MediaQueryList;

// jsdom에는 ResizeObserver도 없다. antd Dropdown·Table이 쓴다
window.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
};
