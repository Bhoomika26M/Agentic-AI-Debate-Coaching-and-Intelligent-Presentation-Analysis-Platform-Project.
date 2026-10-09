import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/Button'

export default function Unauthorized() {
  return <div className="grid min-h-screen place-items-center bg-mist p-6"><div className="max-w-md text-center"><ShieldAlert size={42} className="mx-auto text-coral" /><h1 className="mt-5 font-display text-3xl font-bold text-ink">Access not available</h1><p className="mt-3 text-sm leading-6 text-slate-500">Your current role does not have access to this area.</p><Link to="/dashboard" className="mt-6 inline-block"><Button>Back to dashboard</Button></Link></div></div>
}
