import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { UsersRound } from 'lucide-react'

export default function Students() { return <><PageHeader eyebrow="Role workspace" title="Students" description="Learner oversight will connect here when the backend coaching workflows are available." /><EmptyState icon={UsersRound} title="No learner data yet" description="This role-specific space is ready for the next backend milestone." /></> }
