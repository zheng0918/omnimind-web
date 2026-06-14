import{c as a,n as r,A as c,p as u,U as i,V as e}from"./index-CsL5hHlq.js";import{l as d}from"./document-4Ow0b325.js";/**
 * @license lucide-vue-next v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=a("PlusIcon",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);function o(){return r({method:"GET",url:c.kb.list})}const f=u("kb",{state:()=>{var t;return{currentKbId:((t=e[0])==null?void 0:t.kbId)??"",kbList:e,documents:i,parseStatusMap:{},loading:!1}},getters:{currentKb:t=>t.kbList.find(s=>s.kbId===t.currentKbId)??null,parsedCount:t=>t.documents.filter(s=>s.parseStatus==="PARSED").length},actions:{async fetchList(){this.loading=!0;try{const t=await o();this.kbList=t,!this.currentKbId&&t[0]&&(this.currentKbId=t[0].kbId)}catch{this.kbList=e}finally{this.loading=!1}},async fetchDocuments(t){const s=t??this.currentKbId;if(s){this.currentKbId=s,this.loading=!0;try{this.documents=await d(s)}catch{this.documents=i.filter(n=>n.kbId===s)}finally{this.loading=!1}}}}});export{b as P,f as u};
