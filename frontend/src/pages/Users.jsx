import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { UsersRound } from 'lucide-react'

export default function Users() { return <><PageHeader eyebrow="Administration" title="Users" description="Platform user management will be connected in a later backend milestone." /><EmptyState icon={UsersRound} title="User management is not connected yet" description="The administrator navigation is ready while the API remains under construction." /></> }
