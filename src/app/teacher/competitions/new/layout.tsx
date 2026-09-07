import { requireAdminTeacher } from '@/lib/authz'

export default async function NewCompetitionLayout({ children }: { children: React.ReactNode }) {
  await requireAdminTeacher()
  return <>{children}</>
}
