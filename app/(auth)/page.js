// app/(auth)/page.js
// Trang chủ - hiển thị nhiệm vụ cá nhân

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/request-user'; // Assuming this exists
import PersonalTasksClient from '@/components/tasks/PersonalTasksClient.client';
// Assuming these actions exist and return the specified structure
import { listMyTasks } from '@/data/task/actions';
import { listMyProjects } from '@/data/project/actions/list';
import { listForPicker } from '@/data/appUser/actions';
import { safeSerialize } from '@/lib/serialize.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Ensure data is fresh on each request

export default async function HomePage() {
    const user = await getCurrentUser();
    if (!user || !user.externalUserId) {
        redirect('/login');
    }
    
    // [DEBUG] Log thông tin tài khoản và quyền - TRANG CHỦ
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[HOME PAGE - TRANG CHỦ]');
    console.log('Tài khoản:', {
        userId: user.externalUserId,
        userName: user.name || user.email || 'Unknown',
        userEmail: user.email || 'N/A',
        userRole: user.role || 'member',
        isAdmin: user.role === 'admin',
        fullUser: JSON.stringify(user, null, 2)
    });
    console.log('═══════════════════════════════════════════════════════════');

    // 1. Get user's tasks - chỉ load 12 tasks đầu tiên (infinite scroll sẽ load thêm)
    // Sử dụng filters với limit để chỉ lấy 12 tasks đầu
    const tasksResult = await listMyTasks({ limit: 12 });
    const initialTasks = tasksResult.ok ? (tasksResult.data || []).slice(0, 12) : [];

    // 2. Get user's projects for create task dialog
    // projectsResult = { ok: true, data: { projects: [...] } }
    const projectsResult = await listMyProjects();
    // Correctly access the nested 'projects' array
    const projects = projectsResult.ok ? projectsResult.data.projects : [];

    // 3. Get all necessary user details
    const usersResult = await listForPicker();
    // 4. Standardize user data format for components
    const allUsersWithDetails = usersResult.ok
        ? usersResult.data.items.map(u => ({
            id: u.value,         // Standardize ID field
            name: u.name,
            email: u.email,
            avatarUrl: u.avatar, // Standardize avatar field name
            label: u.label,      // Keep original label if needed
            // Include other fields if UserInfoPopup needs them
            jobTitle: u.jobTitle,
            color: u.color,
        }))
        : [];

    // 5. Prepare simplified user list for pickers (like in CreateTaskDialog)
    const usersForPicker = allUsersWithDetails.map(u => ({
        value: u.id,
        label: u.label || u.name, // Use label, fallback to name
        name: u.name
    }));

    // 6. Serialize all data to ensure no ObjectIds or Mongoose documents are passed to Client Components
    const serializedTasks = safeSerialize(initialTasks);
    const serializedProjects = safeSerialize(projects);
    const serializedUsers = safeSerialize(allUsersWithDetails);
    const serializedUsersForPicker = safeSerialize(usersForPicker);

    // [NEW] Kiểm tra quyền admin
    const isAdmin = user.role === 'admin';

    return (
        <PersonalTasksClient
            initialTasks={serializedTasks}
            projects={serializedProjects} // Pass the correct projects array
            allUsersWithDetails={serializedUsers} // Pass standardized user details
            currentUserId={user.externalUserId}
            users={serializedUsersForPicker} // Pass simplified list for pickers
            isAdmin={isAdmin} // [NEW] Truyền quyền admin
            currentUserName={user.name || user.email || 'Unknown'} // [NEW] Truyền tên người dùng
            currentUserRole={user.role || 'member'} // [NEW] Truyền quyền người dùng
        />
    );
}