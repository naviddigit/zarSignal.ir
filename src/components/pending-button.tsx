'use client';
import { LoaderCircle } from 'lucide-react';
import { useFormStatus } from 'react-dom';
export function PendingButton({children,className='button',pendingText='در حال انجام…'}:{children:React.ReactNode;className?:string;pendingText?:string}){const{pending}=useFormStatus();return <button className={className} type="submit" disabled={pending} aria-busy={pending}>{pending?<><LoaderCircle className="spin" size={17}/>{pendingText}</>:children}</button>}
