import { useState } from "react";
import { useParams } from "react-router-dom";
import { screen } from "../data/load";
import { Wireframe } from "../render/Wireframe";
import type { State } from "../render/resolveProps";
import styles from "./ScreenView.module.css";

/* 화면 한 장. 렌더러를 부르는 얇은 껍데기다.
 *
 * 영역을 그리는 일은 전부 Wireframe(BRQ-0011)이 한다. 여기는 화면 파일을 읽어
 * 넘기고, 고른 영역과 previewState를 쥐는 것까지만 한다.
 *
 * previewState는 **그려진 화면의 것**이고 화면 파일의 `state`로 초기화한다.
 * 뷰어 자신의 state(selectedAreaId 등)와 섞지 않는다. */
export function ScreenView({ screenId }: { screenId: string }) {
  const { projectId } = useParams();
  const data = projectId ? screen(projectId, screenId) : null;

  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<State | null>(null);

  if (!data) {
    return (
      <p className={styles.missing}>
        {screenId}을 읽지 못했습니다. 화면 파일이 없습니다.
      </p>
    );
  }

  return (
    <section>
      <h1 className={styles.title}>
        <span className={styles.id}>{data.id}</span>
        {data.title}
      </h1>

      <Wireframe
        areas={data.areas}
        selectedAreaId={selectedAreaId}
        onSelectArea={setSelectedAreaId}
        previewState={previewState ?? data.state}
        onPreviewStateChange={setPreviewState}
        unrenderedMessage="블록을 그리지 못했습니다"
        emptyMessage="영역이 없습니다"
      />
    </section>
  );
}
