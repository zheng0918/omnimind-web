import{c as y,d as f,u as k,a as d,b as e,w,e as p,v as c,t as h,f as x,g as a,h as m,i as S,r as I,j as L,k as M,o as n,l as T,m as V,R as _}from"./index-CsL5hHlq.js";/**
 * @license lucide-vue-next v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=y("LoaderCircleIcon",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-vue-next v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=y("LogInIcon",[["path",{d:"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4",key:"u53s6r"}],["polyline",{points:"10 17 15 12 10 7",key:"1ail0h"}],["line",{x1:"15",x2:"3",y1:"12",y2:"12",key:"v6grx8"}]]),R={class:"login-page"},U={class:"login-card"},N={key:0,class:"form-error"},O=["disabled"],E=f({__name:"index",setup(q){const i=T(),g=V(),r=k(),o=I(""),t=L({username:"",password:""}),v=M(()=>t.username.length>0&&t.password.length>0);async function b(){o.value="";try{await r.login(t);const u=typeof i.query.redirect=="string"?i.query.redirect:_.workbench;await g.push(u)}catch{o.value="用户名或密码错误，请重试"}}return(u,s)=>(n(),d("main",R,[e("section",U,[s[5]||(s[5]=e("div",{class:"login-brand"},[e("span",{class:"brand-mark"},"O"),e("div",null,[e("h1",null,"OmniMind"),e("p",null,"全智企业智能助手")])],-1)),e("form",{class:"login-form",onSubmit:w(b,["prevent"])},[e("label",null,[s[2]||(s[2]=e("span",null,"用户名",-1)),p(e("input",{"onUpdate:modelValue":s[0]||(s[0]=l=>t.username=l),autocomplete:"username",placeholder:"请输入用户名",type:"text"},null,512),[[c,t.username,void 0,{trim:!0}]])]),e("label",null,[s[3]||(s[3]=e("span",null,"密码",-1)),p(e("input",{"onUpdate:modelValue":s[1]||(s[1]=l=>t.password=l),autocomplete:"current-password",placeholder:"请输入密码",type:"password"},null,512),[[c,t.password,void 0,{trim:!0}]])]),o.value?(n(),d("p",N,h(o.value),1)):x("",!0),e("button",{class:"btn primary login-btn",disabled:!v.value||a(r).loading,type:"submit"},[a(r).loading?(n(),m(a(B),{key:0,class:"spin"})):(n(),m(a(C),{key:1})),s[4]||(s[4]=S(" 登录 ",-1))],8,O)],32)])]))}});export{E as default};
