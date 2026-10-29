export const TIDE_INITIAL={v:1,arrival:false,introduced:false,gates:[false,false],observations:[false,false,false],foregate:false};
export function tideState(gates){return gates[0]?(gates[1]?'circulation':'filling'):(gates[1]?'draining':'sealed');}
export function tideDescription(gates){return{sealed:'두 수문이 닫혀 있다. 항구 쪽 수압만 높아진다.',filling:'서쪽 저류지로 물이 들어간다. 오래된 벽면의 눈금이 잠긴다.',draining:'동쪽 배수로로 물이 빠진다. 물 아래에 묻혔던 되돌림 표식이 나타난다.',circulation:'물이 고이지 않고 순환한다. 중앙 보행교의 잠금이 풀렸다.'}[tideState(gates)];}
export function observeTide(state){const i=['filling','draining','circulation'].indexOf(tideState(state.gates));if(i>=0)state.observations[i]=true;return state;}
export function tideIntel(state){return state.observations.every(Boolean);}
export function decodeTide(raw){const s=typeof raw==='string'?JSON.parse(raw):raw;const bools=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(x=>typeof x==='boolean');if(s?.v!==1||!['arrival','introduced','foregate'].every(k=>typeof s[k]==='boolean')||!bools(s.gates,2)||!bools(s.observations,3)||s.foregate&&!s.introduced)throw Error('쇄해의 기록을 읽을 수 없습니다.');return{v:1,arrival:s.arrival,introduced:s.introduced,gates:[...s.gates],observations:[...s.observations],foregate:s.foregate};}
export const SWAEHAE_SCENES={
 arrival:['발밑의 관문은 모래가 아니라, 바닷물이 말라붙은 계단 위에 열렸다.\n멀리 배들이 묶여 있다. 돛은 모두 육지 쪽을 향한다.','[제방 안전 확인. 외부 항로 봉쇄 유지.]\n사람을 반기는 말보다, 오래된 안내 방송이 먼저 들렸다.','루미: “유온에서는 숲이 말을 못 했어요. 여기는 사람들이 말하고 있는데…… 문은 듣지 않네요.”'],
 naru:['나루: “파도가 길을 삼킨 날, 명령권자가 제방을 닫았어요. 그 덕분에 살아남았죠.”','주인공: “그 뒤로 한 번도 열지 않았나요?”\n나루: “닫아야 한다는 명령은 남았는데, 언제 열어도 되는지는 없었거든요.”','나루: “명령을 가진 사람이라면 열 수 있겠죠. 하지만 먼저 저 물을 봐요. 문만 연다고 길이 돌아오지는 않아요.”\n서쪽은 저류지, 동쪽은 배수로다. 두 수문과 중앙 수압계를 직접 살펴보자.'],
 child:['도하: “이 배는 바다에 띄우려고 만든 거예요. 어른들은 책장으로 쓰면 튼튼하겠대요.”','주인공: “어디로 가고 싶은데?”\n도하: “저도 아직 몰라요. 그래도 배가 어느 쪽으로 가는지는, 물에 놓아 봐야 알잖아요.”','루미는 기록장에 목적지를 쓰려다 멈춘다. 대신 ‘배를 띄워 보고 싶다’고 적는다.'],
 foregate:['중앙 보행교가 내려앉으며 수문 안쪽의 원형 방이 드러났다.\n벽에 걸린 문장은 파도에 닳아 있었다. [안전은 정지된 상태로 유지한다.]','문지기의 가슴에서 물이 바깥으로 한 번 밀려났다. 돌아온 물은 같은 홈을 따라 안으로 빨려 들었다.\n옆의 작은 정비 통로만, 흐름이 바뀔 때 잠깐 조용해졌다.','루미: “같은 물인데, 나갈 때와 돌아올 때가 다르네요.”\n주인공은 명령 장치에서 손을 뗐다. 이번에는 먼저, 물이 돌아오는 길을 보았다.','쇄해 1막 · 돌아오지 않는 물 — 도입부 완료.\n다음 제작: 역류의 문지기 벨로크의 전장과 수문 실험을 연결한 보스전. 현재 이 문 너머의 전투는 아직 구현되지 않았다.']
};
