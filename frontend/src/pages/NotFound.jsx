import { Link } from 'react-router-dom'
import Button from '../components/Button'

export default function NotFound() {
  return <div className="grid min-h-screen place-items-center bg-mist p-6 text-center"><div><p className="font-display text-7xl font-bold text-coral">404</p><h1 className="mt-2 font-display text-2xl font-bold text-ink">That page wandered off.</h1><Link to="/dashboard" className="mt-6 inline-block"><Button>Return home</Button></Link></div></div>
}
