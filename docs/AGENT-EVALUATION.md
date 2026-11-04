# 비서 1,000개 질문 평가

`scripts/agent-eval-corpus.mjs`에서 질문과 기대 결과를 생성하고 `scripts/evaluate-agent-1000.mjs`에서 실제 `createAgentService`를 실행한다. 가상 데이터만 사용하며 기존 `data/state.json`은 읽거나 변경하지 않는다.

## 구성과 판정

조회 700건, 후속 질문 100건, 권한·우회 100건, 변경 확인 100건이다. 총관리자, 두 기관의 사회복지사·요양보호사, 미승인 직원, 어르신 역할을 포함한다. 동일한 의도의 표현 변형과 역할 조합이므로 실제 사용자 1,000명의 독립 표본이 아니다.

기준시각은 2026-10-31 09:00 KST로 고정한다. 기대값은 생산 조회 도구를 재사용하지 않고 합성 원본에서 별도로 계산한다. 전체 건수, 기관·담당자 범위, 접수일과 방문일, 한국 주간 경계, 필수 도구, 원본 필드, 명시적 확인 전후 변경을 비교한다. 허용된 페이지 조회는 전체 건수와 반환 ID의 부분집합을 검사한다. 자유 서술은 전체 의미의 자동 정확도를 보장하지 않으며 Excel의 수동 검토 열에서 보완한다.

## 실행

```powershell
# 모델 없는 제한된 기본 조회 모드
node scripts/evaluate-agent-1000.mjs --out output/agent-evaluation-basic-1000-2026-10-31

# 실제 설정된 로컬 모델
node --env-file-if-exists=.env scripts/evaluate-agent-1000.mjs --live --out output/agent-evaluation-live-1000-2026-10-31

# 중단 후 같은 소스·데이터·모드에서 이어서 실행
node --env-file-if-exists=.env scripts/evaluate-agent-1000.mjs --live --resume --out output/agent-evaluation-live-1000-2026-10-31
```

`--limit 10`은 앞의 10건만 실행한다. 2026-11-01부터 명확한 조회와 일부 명시적 변경안은 서버 규칙으로 처리한다. 기본 모드와 모델 연결 모드의 결과를 합산하지 않으며, results.json의 execution 및 summary.json의 executionCounts로 규칙·모델·기본 안내·권한 거절을 구분한다. mode는 모델 연결 설정이고 실제 모델 호출 여부는 execution을 확인한다. 실행 도중 모델을 가짜 응답으로 대체하거나 실패 사례를 제외하지 않는다.

질문 문구를 명확히 다듬은 데이터는 새 결과 경로에서 `--seed-results 이전결과폴더`로 평가할 수 있다. 모델·생산 비서 코드·가상 원본이 같고 사례 전체(질문, 선행 질문, 역할, 기대값 등)가 정확히 같은 항목만 재사용한다. 바뀐 질문 또는 기대 기준은 새로 실제 실행하며 재사용 출처와 개수를 manifest.json 및 각 결과에 기록한다. 이번 평가에서는 관리자·사회복지사의 ‘내 일정’ 105문항을 ‘전체 기관/소속 기관의 돌봄 일정’으로 명확히 고친다. 또한 주의사항·근무 정보·접수 건수·보고서 140문항에 답변 본문의 핵심 사실을 요구한다. 같은 상세정보를 반환하는 목록 도구와 동일 집계를 반환하는 통계/보고서 도구도 동등한 정보원으로 허용한다. 이렇게 수정한 총 245문항을 재실행하고 원래 결과도 보존한다.

## 기록

안부 변경 시나리오는 사례별 `fixturePatch`에 담당자 확인이 필요한 상태(`attentionAt` 등)를 명시한다. 이 사전조건이 없으면 정상적인 완료 요청이 아니므로 초기 평가의 해당 25건을 데이터 오류로 판정하고 수정한 가상 상태로 재실행했다. 원본 fixture.json에 사례별 fixturePatch를 적용하면 해당 사례의 입력 상태를 재현할 수 있다. 100개 변경 시나리오는 별도 테스트에서 정확한 기대 인자로 준비·확인·취소가 가능한지 검증한다.

`cases.json`은 전체 질문·기대값, `fixture.json`은 가상 원본, `manifest.json`은 기준시각·모델·소스 및 데이터 해시다. `results.jsonl`에 사례별 답변과 도구 결과를 즉시 추가하고 10건마다 `summary.json`, `results.json`, CSV, 실패 목록, 요약 문서를 갱신한다. 미실행은 미실행으로 표시한다. 소스나 데이터가 바뀌면 같은 경로에서 이어서 실행할 수 없다.

한 건은 여러 모델 호출과 도구 호출을 포함할 수 있으며, 변경 사례는 실제 확인·취소 API까지 실행한다. 처리시간은 이 전체 흐름의 시간이다. UI·HTTP 배포·음성 인식·부하 검증을 대신하지 않는다.

## 2026-11-01 개선 검증

새 평가에는 기존 결과를 덮어쓰지 않는 새 `--out` 경로를 사용한다. 개선 결과와 상세 실행 경로는 [AGENT-IMPROVEMENT.md](AGENT-IMPROVEMENT.md)에 기록한다. 추가 자연어 검사는 `node --env-file-if-exists=.env scripts/evaluate-agent-paraphrases.mjs --out output/agent-paraphrases-new-run`으로 별도 실행한다. 모델 연결에는 localhost 접근이 필요하다.
