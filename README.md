# RE:COMMAND v0.2 · 리커맨드
첫 행성 유온의 기술·스토리 시제품입니다. 남은 세 행성과 최종장 컷신은 아직 구현하지 않았습니다.

## 플레이
저장소를 내려받은 뒤 `release/RECOMMAND.html`을 Chrome/Edge로 여세요. 설치나 외부 다운로드가 필요 없습니다.
WASD/방향키 이동, J 검격(누르면 연타), K/Space 회피, L 파동, E 대화·조사.
F1 원리 보기, C 평면/곡면 비교, V 판정 표시, M 지도 확대.
자동 저장, 백업 복구, 진행 파일 내보내기/가져오기, 발견 기록을 제공합니다.

## 소스 실행
Node.js 20 이상: node server.mjs → http://127.0.0.1:4173
모듈형 dist/index.html을 직접 더블클릭하면 브라우저 보안 정책으로 실행되지 않을 수 있습니다. 독립 파일 release/RECOMMAND.html을 사용하세요.
node build-standalone.mjs → 독립 실행 파일 생성
node --test tests/*.test.mjs → 자동 검사

## 이번 범위
이동·충돌·실시간 검격·회피·파동, 제단 3개, 일반 적 13체와 보스 1체, 선택 서브 퀘스트, 숨은 단서, 기본/대안 선택, 저장 및 원리 패널.
WebGL 지원 시 GPU 렌더러, 미지원 시 Canvas2D CPU 투영 렌더러를 선택합니다.
그림·지형·효과음은 임시 코드 에셋입니다. 다른 작품의 이미지·음악·대사를 사용하지 않았습니다.

dist/LEARNING.md: 구현 원리와 한계
STORY.md: 제작자용 설계 및 미래 행성의 정보 획득 방식
ENDING-SCENE.md: 네 번째 행성 최종 대사 초안 (게임 내 실행 컷신 아님)
VERIFICATION.md: 실제 검증 결과와 미검증 항목

스페이스카운터 저장소와는 별개입니다.

