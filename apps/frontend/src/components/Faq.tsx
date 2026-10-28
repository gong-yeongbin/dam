import { cn } from 'cn';
import { useState } from 'react';

// 랜딩과 요금 페이지가 같이 쓴다. 값은 plan.md 결정 11과 같다
export const FAQ = [
	{ q: '포함 이벤트를 넘으면 어떻게 되나요?', a: 'Free는 그 달 남은 웹훅을 받지 않고 429로 거부합니다. 보낸 쪽이 실패를 알고 다시 보냅니다. Team은 초과분만큼 10만 건당 10,000원부터 청구되고, 많이 쓸수록 단가가 내려갑니다.' },
	{ q: '플랜은 언제 바꿀 수 있나요?', a: '가입하면 Free로 시작합니다. 플랜 변경과 결제는 준비 중입니다.' },
	{ q: '이벤트는 무엇을 세나요?', a: '받아서 저장한 웹훅 한 건이 이벤트 하나입니다. 연결된 목적지가 여러 곳이어도 한 건이고, 같은 웹훅이 다시 오면 세지 않습니다. 재시도는 세지 않고, 대시보드에서 리플레이하면 새 이벤트로 셉니다.' },
];

// 왼쪽은 질문 목록, 오른쪽은 고른 질문의 답 하나. 마우스를 올리거나 포커스만 가도 바뀐다
export function Faq() {
	const [index, setIndex] = useState(0);
	return (
		<div className="grid grid-cols-12 gap-8">
			<ul className="col-span-5 m-0 flex list-none flex-col gap-[18px] p-0 text-lg">
				<li className="text-cobalt-muted">자주 묻는 질문</li>
				{FAQ.map((item, i) => (
					<li key={item.q}>
						<button
							type="button"
							aria-current={i === index}
							onMouseEnter={() => setIndex(i)}
							onFocus={() => setIndex(i)}
							onClick={() => setIndex(i)}
							className={cn('flex items-center gap-3 text-left underline-offset-4 hover:underline', i === index ? 'text-primary' : 'text-cobalt-muted')}
						>
							<span aria-hidden className={cn('size-2 shrink-0 rounded-full', i === index ? 'bg-primary' : 'bg-cobalt-muted/50')} />
							{item.q}
						</button>
					</li>
				))}
			</ul>
			<p aria-live="polite" className="sticky top-[120px] col-span-6 col-start-7 max-w-[30ch] self-start text-[26px] leading-[1.3] text-primary transition-opacity duration-150">
				{FAQ[index]!.a}
			</p>
		</div>
	);
}
