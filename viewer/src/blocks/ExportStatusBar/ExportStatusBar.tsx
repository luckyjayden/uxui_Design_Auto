import alertCircle from "../../assets/icons/alert-circle-18.svg";
import check from "../../assets/icons/check-18.svg";
import download from "../../assets/icons/download-18.svg";
import refresh18 from "../../assets/icons/refresh-18.svg";
import refresh16 from "../../assets/icons/refresh-16.svg";
import styles from "./ExportStatusBar.module.css";

/* BRQ-0010 내보내기 상태 줄
 *
 * 디자인   Figma 6sNGJRUgMlVSCDuym6e08z  node 4:408 (Block/ExportStatusBar)
 * 쓰는 곳   SCR-004-A07 유저 플로우 PNG · SCR-005-A08 화면설계서 PPTX
 *
 * 알림 줄(BRQ-0005·0006)과 props가 달라 따로 둔다. 화면설계서 9절의 판단이다.
 *
 * 실패해도 **화면의 내용은 바뀌지 않는다.** 다시 시도만 둔다. */

export type ExportStatus = "idle" | "exporting" | "done" | "failed";

/** 화면 파일이 쓰는 한글 값과 디자인의 네 상태를 잇는다. */
const ALIAS: Record<string, ExportStatus> = {
  "대기": "idle",
  "내보내는 중": "exporting",
  "완료": "done",
  "실패": "failed",
};

const ICON: Record<ExportStatus, string> = {
  idle: download,
  exporting: refresh18,
  done: check,
  failed: alertCircle,
};

const TITLE: Record<ExportStatus, string> = {
  idle: "아직 내보내지 않았습니다",
  exporting: "내보내는 중",
  done: "내보냈습니다",
  failed: "내보내지 못했습니다",
};

export interface ExportStatusBarProps {
  /** 무엇을 내보내는지. 'PNG'·'PPTX' 같은 말이 온다. */
  tone?: string;
  /** 지금 상태. 네 값 또는 화면 파일이 쓰는 한글 값. */
  status?: ExportStatus | string | null;
  /** 상태 아래 작은 글. 실패하면 까닭이 온다. */
  message?: string;
  retryLabel?: string;
  onRetry?: (next: ExportStatus) => void;
}

export function ExportStatusBar({
  tone,
  status,
  message,
  retryLabel = "다시 시도",
  onRetry,
}: ExportStatusBarProps) {
  const s: ExportStatus =
    (typeof status === "string" && (ALIAS[status] ?? (status as ExportStatus))) || "idle";
  const known: ExportStatus = ["idle", "exporting", "done", "failed"].includes(s) ? s : "idle";

  return (
    <div className={`${styles.bar} ${styles[known]}`} data-status={known}>
      <img className={styles.icon} src={ICON[known]} alt="" width={18} height={18} />
      <div className={styles.text}>
        <p className={styles.title}>{TITLE[known]}</p>
        {(message || tone) && (
          <p className={styles.message}>{known === "failed" ? message : (message ?? tone)}</p>
        )}
      </div>
      {known === "failed" && (
        <button type="button" className={styles.retry} onClick={() => onRetry?.("exporting")}>
          {retryLabel}
          <img src={refresh16} alt="" width={16} height={16} />
        </button>
      )}
    </div>
  );
}
