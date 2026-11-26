# 오디오 안내

오디오 개발판 v0.6.4-preview.1의 기능이다. 공개 안정판 v0.6.3과 구분한다.

## 음악

통합 실행판은 네 곡의 스테레오 Opus 음원을 내장하고 Web Audio에서 루프 재생한다. 기본은 꺼짐이다. 오른쪽 위 배경음악 메뉴에서 켜기·끄기와 음량을 조절한다. 음악 설정은 `recommand-music-v1`에 보관하며 게임 진행 기록과 분리한다.

- 유온 「남겨진 숨」은 82 BPM의 업라이트 피아노와 플루트 중심이다.
- 쇄해 「닻 아래의 물결」은 느린 두 박을 하프 세 음으로 나누고 첼로 선율을 얹었다. BPM은 큰 박 기준 58이다.
- 무명 「눈에 남은 이름」은 57 BPM의 세 박에 피아노와 첼로, 가끔 울리는 종을 배치했다.
- 환성 「대답이 닿는 궤도」는 52 BPM으로 낮은 현을 길게 남기고 피아노를 띄엄띄엄 배치했다.

선율·화성·믹스는 이 프로젝트에서 작성했다. 개별 악기 녹음은 Versilian Studios의 [VSCO 2 Community Edition](https://github.com/sgossner/VSCO-2-CE/tree/440300901dfe9275fd84e0b7763af1f8443ae62e)에서 가져왔다. 사용한 업라이트 피아노는 Simon Dalzell(Ivy Audio)이 녹음했다. 이 라이브러리의 녹음 배포 조건은 [CC0 1.0](https://github.com/sgossner/VSCO-2-CE/blob/440300901dfe9275fd84e0b7763af1f8443ae62e/LICENSE)이다. 참고곡 MP3는 배포물에 포함되지 않는다.

일반 실행판 빌드는 믹스 완료 파일 `dist/audio/music/*.ogg`를 내장한다. 다시 믹싱할 때만 `node render-music.mjs <샘플 폴더> [ffmpeg]`를 사용한다. 샘플 폴더에는 고정 버전 원본에서 아래 녹음을 이름에 맞춰 둔다.

| 로컬 이름 | VSCO 2 CE 원본 경로 |
|---|---|
| piano-low.wav | `Keys/Upright Piano/Player_dyn1_rr1_018.wav` |
| piano-high.wav | `Keys/Upright Piano/Player_dyn2_rr1_030.wav` |
| harp-low.wav | `Strings/Harp/KSHarp_C3_mf.wav` |
| harp-high.wav | `Strings/Harp/KSHarp_D4_mf.wav` |
| cello-low.wav | `Strings/Cello Section/susvib/susvib_D2_v1_1.wav` |
| cello-mid.wav | `Strings/Cello Section/susvib/susvib_C3_v1_1.wav` |
| cello-high.wav | `Strings/Cello Section/susvib/susvib_G3_v1_1.wav` |
| flute-mid.wav | `Woodwinds/Flute/susvib/LDFlute_susvib_A4_v1_1.wav` |
| flute-high.wav | `Woodwinds/Flute/susvib/LDFlute_susvib_E5_v1_1.wav` |
| glock.wav | `Percussion/Glock/glock_medium_C6.wav` |

행성 이동 때 이전 곡을 줄이고 새 곡을 올린다. 숨긴 탭에서는 연주 예약과 오디오 컨텍스트를 정지한다. 음악은 통합판에 제공하며 개별 행성 HTML과 보스전 별도 음악은 후속 작업이다.

## 한국어 나레이션

TTSMaker의 한국어 준혁 507 음성을 사용했다. 프롤로그 세 장면과 각 행성의 첫 소개, 총 일곱 장면의 MP3를 실행판 안에 넣었다. 보조 안내 네 장면은 글로 제공한다. 기본 음성 듣기는 꺼짐이다. 장면을 넘기거나 안내를 닫으면 음성을 중지하고, 재생 오류가 나면 글로 계속한다. 재생 중 배경음악을 줄이고 종료·중지·오류 시 복원한다.

게임 실행 중에는 TTSMaker에 접속하거나 대본을 전송하지 않는다. 브라우저에 별도의 한국어 음성 엔진이 없어도 내장 MP3를 사용한다. 보스 대응법, 퍼즐 정답, 히든 퀘스트의 조건을 음성에 추가하지 않았다.

제공처: https://ttsmaker.com/ko

사용 권한: https://ttsmaker.com/copyright_and_commercial_license_terms/ko

공식 조건 확인일: 2026-11-01. 생성 음성은 게임 내 사용과 재배포를 허용하는 이용 라이선스를 받으며, 음성 모델이나 기술의 소유권을 취득하는 것은 아니다. 생성 음원의 출처·대본·파일명은 `dist/audio/narration.json`에 기록했다.

일괄 원본은 `journey-intros.mp3`이며 장면 사이에 공식 입력 형식으로 5초 무음을 넣었다. `split-narration.mjs`는 인코딩 데이터에서 다섯 무음 구간을 검증한 뒤 그 안에서 잘라 여섯 개의 독립 MP3를 만든다. 글자 수로 재생 시간을 추정해 자르지 않는다.

## 검증 범위

자동 검사 96개 통과. TTSMaker의 Chrome 결과 화면에서 원본 재생 상태와 길이를 확인했다. 실제 게임에서의 청취, 분리 파일 음질, 음량 균형과 메뉴 배치는 실행 환경 정책으로 아직 검증하지 못했다. 공개 안정판에는 아직 반영하지 않는다.
