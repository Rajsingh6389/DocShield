import{c as u,r as i,j as e,m as h}from"./index-HATU3Jpy.js";import{E as w}from"./eye-BswhDdOR.js";/**
 * @license lucide-react v0.363.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=u("EyeOff",[["path",{d:"M9.88 9.88a3 3 0 1 0 4.24 4.24",key:"1jxqfv"}],["path",{d:"M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68",key:"9wicm4"}],["path",{d:"M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61",key:"1jreej"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22",key:"a6p6uj"}]]);/**
 * @license lucide-react v0.363.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=u("Lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]),g=i.forwardRef(({label:l,icon:r,type:a="text",error:o,className:x="",...t},y)=>{const[n,f]=i.useState(!1),[b,d]=i.useState(!1),m=a==="password"&&n?"text":a;return e.jsxs("div",{className:"flex flex-col w-full relative",children:[l&&e.jsx("label",{className:"text-xs font-hud tracking-widest text-cyber-cyan mb-2 uppercase flex items-center gap-2",children:l}),e.jsxs("div",{className:`relative group ${x}`,children:[r&&e.jsx("div",{className:"absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyber-cyan transition-colors z-10",children:e.jsx(r,{size:18})}),e.jsx("input",{ref:y,type:m,onFocus:c=>{var s;d(!0),(s=t.onFocus)==null||s.call(t,c)},onBlur:c=>{var s;d(!1),(s=t.onBlur)==null||s.call(t,c)},className:`
            w-full bg-obsidian-900/60 border border-white/10 text-white placeholder-gray-500
            text-sm font-mono py-3 rounded
            focus:outline-none focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan
            transition-all duration-300
            ${r?"pl-10":"pl-4"}
            ${a==="password"?"pr-10":"pr-4"}
            ${o?"border-cyber-red focus:border-cyber-red focus:ring-cyber-red":""}
          `,...t}),e.jsx(h.div,{initial:!1,animate:{opacity:b?1:0},className:"absolute inset-0 rounded pointer-events-none shadow-[0_0_15px_rgba(0,229,255,0.15)_inset] border border-cyber-cyan/30"}),a==="password"&&e.jsx("button",{type:"button",onClick:()=>f(!n),className:"absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-cyber-cyan transition-colors z-10",children:n?e.jsx(j,{size:18}):e.jsx(w,{size:18})})]}),o&&e.jsx("span",{className:"text-xs text-cyber-red mt-1 font-mono tracking-wide",children:o})]})});g.displayName="Input";export{g as I,v as L};
