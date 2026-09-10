import React,{useState} from 'react';
import {ExternalLink} from 'lucide-react';
export default function SourceLink({href,en,children}){
 const [message,setMessage]=useState('');
 let url;try{url=new URL(href);if(!['https:','http:','mailto:','tel:'].includes(url.protocol))url=null;}catch{url=null;}
 if(!url)return <small>{en?'No usable public URL':'暂无可用的公开链接'}</small>;
 async function copy(){try{await navigator.clipboard.writeText(url.href);setMessage(en?'Copied. Paste into another browser if this page cannot load.':'已复制。如页面无法加载，可粘贴到其他浏览器尝试。');}catch{setMessage(en?'Select the URL below and copy it manually.':'请选中下方网址手动复制。');}}
 return <span className="source-link-block"><span className="source-link-actions"><a className="assessment-source" href={url.href} target="_blank" rel="noopener noreferrer">{children|| (en?'Open website':'打开网页')} <ExternalLink size={13}/></a><button type="button" className="text-btn" onClick={copy}>{en?'Copy link':'复制链接'}</button></span><input aria-label={en?'Source URL':'来源网址'} readOnly value={url.href} onFocus={e=>e.target.select()}/>{message&&<small role="status">{message}</small>}</span>;
}
