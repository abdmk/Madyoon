import { redirect } from 'next/navigation';

export default function Home() {
  // The middleware bounces signed-out visitors to /login before this runs.
  redirect('/dashboard');
}
