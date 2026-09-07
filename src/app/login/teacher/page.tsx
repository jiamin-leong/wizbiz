import { emailIsConfigured } from '@/lib/email'
import TeacherLoginForm from './TeacherLoginForm'

// Which sign-in method leads depends on whether email can actually be sent.
export default function TeacherLoginPage() {
  return <TeacherLoginForm emailWorks={emailIsConfigured()} />
}
