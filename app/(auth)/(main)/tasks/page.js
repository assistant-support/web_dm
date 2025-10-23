// app/(auth)/(main)/tasks/page.js
// Redirect to home page (tasks is now the homepage)

import { redirect } from 'next/navigation';

export default async function TasksRedirectPage() {
    // Redirect to home page where tasks are displayed
    redirect('/');
}
