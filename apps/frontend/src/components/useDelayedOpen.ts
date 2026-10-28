import { useEffect, useState } from 'react';

// 행 클릭과 같은 이벤트 안에서 Sheet를 열면 Base UI가 그 클릭을 바깥 클릭으로 보고 바로 닫는다. 한 틱 뒤에 연다
export function useDelayedOpen() {
	const [open, setOpen] = useState(false);
	useEffect(() => {
		const t = setTimeout(() => setOpen(true), 0);
		return () => clearTimeout(t);
	}, []);
	return open;
}
