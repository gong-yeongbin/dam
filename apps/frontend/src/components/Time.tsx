import { Tooltip } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('ko');

export const formatTime = (iso: string) => dayjs(iso).format('YYYY-MM-DD HH:mm:ss');

// 목록은 상대 시간("3분 전"), 마우스를 올리면 절대 시간
export function Time({ iso }: { iso: string }) {
	return (
		<Tooltip title={formatTime(iso)}>
			<time dateTime={iso}>{dayjs(iso).fromNow()}</time>
		</Tooltip>
	);
}
