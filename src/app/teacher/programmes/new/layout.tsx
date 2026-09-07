import { requireAdminTeacher } from '@/lib/authz'

// Client pages cannot guard themselves; this runs on the server first.
export default async function NewProgrammeLayout({ children }: { children: React.ReactNode }) {
  await requireAdminTeacher()
  return <>{children}</>
}
