const a=(e,t="")=>getComputedStyle(document.documentElement).getPropertyValue(e).trim()||t,m=e=>e.map(({name:t,fallback:s})=>a(t,s));export{a,m as g};
