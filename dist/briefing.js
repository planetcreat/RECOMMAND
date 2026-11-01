// Spoiler-light context and practical first objectives, separate from gameplay saves.
export const PROLOGUE=[
 {tag:'PROLOGUE · 01',title:'별은 오래된 명령을 기억한다',body:'당신은 기억을 잃은 채 작은 별, 유온에서 눈을 뜹니다. 별을 지키기 위해 남겨진 오래된 명령은 아직 작동하고 있습니다. 하지만 보호를 위한 장치가 생명을 공격하고, 안전을 위한 문이 누군가의 길을 막습니다.',goal:'무슨 일이 있었는지, 주민과 기록을 통해 알아보세요.'},
 {tag:'PROLOGUE · 02',title:'명령하기 전에, 먼저 묻는다',body:'숲의 기록자 루미가 당신과 함께합니다. 두 사람은 서로 다른 문제를 품은 네 행성을 여행합니다. 주민의 말을 듣고, 장치의 반응을 살피고, 남겨진 기록을 읽으세요. 싸움에서 이긴 뒤에도 어떤 명령을 남길지는 당신의 선택입니다.',goal:'앞선 별에서 한 선택은 다음 별의 반응으로 돌아옵니다.'},
 {tag:'HOW TO PLAY',title:'듣고, 살피고, 스스로 판단한다',body:'주민이나 장치 가까이에서 E를 누르면 대화·조사가 시작됩니다. 이동과 전투의 조작법은 화면 아래에서 확인할 수 있습니다. 오른쪽의 현재 목표를 참고하되, 이 별에 무슨 일이 있었는지는 당신이 직접 보고 들으며 알아가세요.',goal:'모든 이야기가 처음부터 보이지는 않습니다. 발견한 말과 풍경을 기억해 두세요.'}
];
export const BRIEFINGS={
 yuon:[{tag:'PLANET 01 · YUON',title:'유온 — 남겨진 숨의 정원',body:'울창한 숲에는 아직 따뜻한 빛이 남아 있습니다. 하지만 숲을 보호하던 수호 장치가 생명들을 공격하고 있습니다. 이곳에서 당신을 기다린 기록자 루미는 무언가를 알고 있는 듯합니다.',goal:'첫걸음: 가까이 있는 루미에게 다가가 이야기를 나눠 보세요.'},{tag:'YUON · FIRST STEPS',title:'낯선 숲에서 들려오는 말',body:'당신이 기억하지 못하는 시간을 이 별은 기억하고 있습니다. 기록에 남은 말과 지금 눈앞에 있는 풍경이 같은 이야기를 하고 있는지, 천천히 살펴보세요.',goal:'무엇이 달라졌는지, 누구에게 다시 물어볼지는 직접 찾아가며 판단하세요.'}],
 swaehae:[{tag:'PLANET 02 · SWAEHAE',title:'쇄해 — 닫힌 길의 바다',body:'항구의 배들은 닻을 올리지 못합니다. 사람들은 제방이 자신들을 지켜 준다고 말하지만, 누군가는 바다 건너의 소식을 기다립니다. 안전하다는 말 뒤에 무엇이 남아 있는지 들어 보세요.',goal:'첫걸음: 항구의 제방지기 나루에게 이곳의 사정을 물어보세요.'},{tag:'SWAEHAE · FIRST STEPS',title:'멈춘 항구의 목소리',body:'오랫동안 같은 자리를 지킨 사람은 당신이 보지 못한 변화를 알고 있을지 모릅니다. 항구의 풍경과 주민의 말을 기억해 두세요. 모든 사정이 처음 만난 자리에서 드러나지는 않습니다.',goal:'왜 길이 닫혀 있는지, 그 길을 기다리는 사람은 누구인지 알아가세요.'}],
 mumyeong:[{tag:'PLANET 03 · MUMYEONG',title:'무명 — 지워진 이름의 설원',body:'눈 속 마을에는 문패가 남아 있지만 이름이 비어 있습니다. 사람들은 같은 과거를 서로 다르게 기억합니다. 잊힌 것은 이름뿐일까요. 이 마을의 기록은 당신의 기억에도 닿아 있습니다.',goal:'첫걸음: 마을의 시온을 만나 이야기를 들어 보세요.'},{tag:'MUMYEONG · FIRST STEPS',title:'누구의 기억을 믿을 것인가',body:'한 사람의 말만으로 모든 일이 설명되지는 않습니다. 서로 다른 목소리 사이에 무엇이 남고 무엇이 빠졌는지, 당신이 들은 이야기를 되짚어 보세요.',goal:'누구의 이름도 서둘러 대신 정하지 마세요. 이곳에 남은 말들을 먼저 들어 보세요.'}],
 hwanseong:[{tag:'PLANET 04 · HWANSEONG',title:'환성 — 돌아온 목소리의 궤도',body:'땅 아래로 별이 흐르고, 먼 곳의 목소리가 궤도에 도착합니다. 당신이 지나온 곳에도 시간은 흘렀습니다. 그곳에 남긴 선택은 어떤 대답으로 돌아왔을까요.',goal:'첫걸음: 통신환에서 들려오는 목소리에 귀를 기울여 보세요.'},{tag:'HWANSEONG · FIRST STEPS',title:'대답을 기다리는 자리',body:'여정의 끝에서 다시 명령 앞에 섭니다. 당신 혼자 알고 있다고 생각했던 일에도 다른 목소리가 남아 있습니다. 루미 역시 이곳을 바라보고 있습니다.',goal:'지나온 선택과 지금 곁에 있는 사람을 돌아보세요. 마지막 판단은 당신에게 남아 있습니다.'}]
};
export const BRIEFING_KEY='recommand-briefing-v1';
export function readBriefingSeen(read){try{const value=JSON.parse(read(BRIEFING_KEY)||'{}');if(!value||typeof value!=='object'||Array.isArray(value))return{};return Object.fromEntries(['intro',...Object.keys(BRIEFINGS)].filter(k=>value[k]===true).map(k=>[k,true]));}catch{return{};}}
export function pendingBriefing(chapter,seen){return [...(!seen.intro?PROLOGUE:[]),...(!seen[chapter]?(BRIEFINGS[chapter]||[]):[])];}
