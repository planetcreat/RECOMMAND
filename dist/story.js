// Narrative conditions are independent of display/UI and can be tested in Node.
export function canRewrite(state){return state.memories?.[0]===true&&state.memories?.[1]===true&&state.bond===true&&state.fracture===true;}
export function discoveredTriggers(state){return Number(!!state.memories?.[0])+Number(!!state.memories?.[1])+Number(!!state.bond)+Number(!!state.fracture);}
