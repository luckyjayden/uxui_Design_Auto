import chevronRight from "../../assets/icons/chevron-right-16.svg";
import externalLink from "../../assets/icons/external-link.svg";
import fileText from "../../assets/icons/file-text-14.svg";
import { Badge, toneOf } from "../../base/Badge/Badge";
import styles from "./SummaryCard.module.css";

/* BRQ-0004 고른 단계 요약 카드
 *
 * 디자인   Figma 6sNGJRUgMlVSCDuym6e08z  node 7:681 (Block/SummaryCard)
 * 쓰는 곳   SCR-002-A05 단계 · SCR-006-A04 검증 규칙
 *
 * 문서 이름·상태·마지막 변경·만든 파일을 한 카드에 담고, 바깥으로 나가는 길을 둔다.
 *
 * **카드 안에 승인·실행 버튼을 두지 않는다**(POL-002, FSD 7절). 고치는 자리는
 * GitHub, 실행·수정 요청은 세션이다. */

export interface SummaryLink {
  label: string;
  href?: string;
  /** 참이면 뷰어 안에서 옮기는 길이다. 바깥으로 나가지 않는다. */
  internal?: boolean;
  onClick?: () => void;
}

export interface Summary {
  title?: string;
  /** 마지막 변경, PR 번호 같은 곁줄. */
  meta?: string[];
  /** 만든 파일의 경로. */
  files?: string[];
}

export interface SummaryCardProps {
  summary?: Summary | null;
  /** 문서 상태 또는 검증 판정(통과·실패). */
  status?: string | null;
  links?: SummaryLink[];
  emptyMessage?: string;
}

export function SummaryCard({
  summary,
  status,
  links = [],
  emptyMessage = "고른 것이 없습니다",
}: SummaryCardProps) {
  if (!summary || !summary.title) {
    return <div className={styles.card}><p className={styles.empty}>{emptyMessage}</p></div>;
  }

  // 화면 파일이 links에 엉뚱한 배열을 넘기는 자리가 있다(SCR-002-A05는
  // `stages`를 넘긴다). label이 없는 것은 링크가 아니므로 거른다.
  const usable = links.filter((l) => typeof l?.label === "string");
  const inner = usable.filter((l) => l.internal);
  const outer = usable.filter((l) => !l.internal);

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.title}>{summary.title}</span>
        {status && <Badge label={status} tone={toneOf(status)} />}
      </div>

      {summary.meta && summary.meta.length > 0 && (
        <div className={styles.meta}>
          {summary.meta.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
      )}

      {summary.files && summary.files.length > 0 && (
        <div className={styles.files}>
          {summary.files.map((f) => (
            <span key={f} className={styles.file}>
              <img src={fileText} alt="" width={14} height={14} />
              <span className={styles.path}>{f}</span>
            </span>
          ))}
        </div>
      )}

      {usable.length > 0 && (
        <div className={styles.links}>
          {inner.map((l) => (
            <button key={l.label} type="button" className={styles.button} onClick={l.onClick}>
              {l.label}
              <img src={chevronRight} alt="" width={16} height={16} />
            </button>
          ))}
          {outer.map((l) =>
            l.href ? (
              <a
                key={l.label}
                className={styles.link}
                href={l.href}
                target="_blank"
                rel="noreferrer noopener"
              >
                {l.label}
                <img src={externalLink} alt="" width={14} height={14} />
              </a>
            ) : (
              <span key={l.label} className={styles.linkOff}>
                연결할 곳이 없습니다
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
}
