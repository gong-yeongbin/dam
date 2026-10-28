// 구글 로그인(Google Identity Services). 스크립트를 한 번 받아 버튼을 그리고, 사용자가 고르면 ID 토큰을 준다.
// 그 토큰을 백엔드 POST /auth/google에 넘기면 우리 JWT가 온다
type CredentialResponse = { credential: string };
type GoogleId = {
	initialize(options: { client_id: string; callback: (response: CredentialResponse) => void; ux_mode?: 'popup' }): void;
	renderButton(parent: HTMLElement, options: { theme?: 'outline' | 'filled_blue'; size?: 'large'; text?: 'signin_with' | 'continue_with'; width?: number; locale?: string }): void;
};
declare global {
	interface Window {
		google?: { accounts: { id: GoogleId } };
	}
}

const SCRIPT = 'https://accounts.google.com/gsi/client';
let loading: Promise<GoogleId> | null = null;

export function loadGoogle(): Promise<GoogleId> {
	if (window.google) return Promise.resolve(window.google.accounts.id);
	loading ??= new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = SCRIPT;
		script.async = true;
		script.onload = () => (window.google ? resolve(window.google.accounts.id) : reject(new Error('구글 로그인 스크립트를 불러오지 못했습니다.')));
		script.onerror = () => reject(new Error('구글 로그인 스크립트를 불러오지 못했습니다.'));
		document.head.appendChild(script);
	});
	return loading;
}

// parent 안에 구글 버튼을 그린다. 사용자가 계정을 고르면 onToken(ID 토큰)
export async function renderGoogleButton(parent: HTMLElement, clientId: string, onToken: (idToken: string) => void): Promise<void> {
	const id = await loadGoogle();
	id.initialize({ client_id: clientId, callback: ({ credential }) => onToken(credential), ux_mode: 'popup' });
	id.renderButton(parent, { theme: 'outline', size: 'large', text: 'continue_with', width: 336, locale: 'ko' });
}
