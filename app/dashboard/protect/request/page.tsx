import { redirect } from 'next/navigation';

// Redireciona para o hub principal do Protect
export default function RequestPage() {
  redirect('/dashboard/protect');
}
