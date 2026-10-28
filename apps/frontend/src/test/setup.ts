import { server } from './msw';

// .env.local의 구글 클라이언트 ID가 테스트에 새지 않게. 로그인 화면은 개발용 버튼으로 뜬다
vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');

// 모든 테스트가 같은 가짜 백엔드를 쓴다. 핸들러에 없는 요청은 오류로 잡는다
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// jsdom에 없는 것들. Base UI(Select·Menu·Dialog)와 sonner가 쓴다
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

window.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
};

Element.prototype.scrollIntoView ??= () => undefined;
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => undefined;
Element.prototype.releasePointerCapture ??= () => undefined;
