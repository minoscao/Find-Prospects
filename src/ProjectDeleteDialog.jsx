import React,{useEffect,useRef} from 'react';
import './project-delete.css';
export default function ProjectDeleteDialog({project,en,onCancel,onConfirm}){
 const dialog=useRef(null);const bi=v=>Array.isArray(v)?v[en?1:0]:v,t=(a,b)=>en?b:a;
 useEffect(()=>{const node=dialog.current;node.showModal();return()=>node.close();},[]);
 return <dialog ref={dialog} className="project-delete-dialog" aria-labelledby="project-delete-title" aria-describedby="project-delete-description" onCancel={e=>{e.preventDefault();onCancel();}}><h2 id="project-delete-title">{t('确认删除项目？','Delete this project?')}</h2><p className="project-delete-name">{bi(project.product)} · {bi(project.region)}</p><p id="project-delete-description">{t('确认后，此项目将从看板移除。客户档案、完整评估和沟通记录会保留。','This project will be removed from the board. Customer profiles, assessments and communication records will be kept.')}</p><div className="project-delete-actions"><button className="btn secondary" autoFocus onClick={onCancel}>{t('取消','Cancel')}</button><button className="btn project-delete-confirm" onClick={onConfirm}>{t('确认删除','Confirm deletion')}</button></div></dialog>;
}
