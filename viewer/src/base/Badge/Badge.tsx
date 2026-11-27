import styles from "./Badge.module.css";

/* Base/Badge — Figma node 1:157
 *
 * 문서·단계 상태를 보이는 배지다. **색만이 아니라 글자로 상태를 적는다**
 * (Figma 컴포넌트 설명). 색을 못 가리는 사람도 읽을 수 있어야 한다.
 *
 * 블록이 아니라 블록이 쓰는 화면 요소라 blocks/가 아니라 base/에 둔다. */

export type Tone = "neutral" | "info" | "warning" | "success" | "danger" | "unknown";

/** 문서 상태 다섯(POL-005)과 배지 색의 대응. */
const TONE_OF: Record<string, Tone> = {
  "대기": "neutral",
  "생성 중": "info",
  "수정 필요": "warning",
  "검토 필요": "warning",
  "승인": "success",
  "실패": "danger",
  "통과": "success",
};

/** 상태 값에서 배지 색을 가린다. 다섯 값 밖이면 '알 수 없음'이다(POL-005). */
export function toneOf(state: string | null | undefined): Tone {
  if (!state) return "unknown";
  return TONE_OF[state] ?? "unknown";
}

export function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: Tone;
}) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{label}</span>;
}
