/**
 * Visual test để kiểm tra MessageFormatter format đúng các pattern
 * Chạy: node components/demo/__tests__/MessageFormatter.visual.test.js
 */

// Test cases
const testMessages = [
  {
    name: 'Quoted comma-separated list (Case user)',
    input: 'Các dự án đang chạy của bạn là: "test dự án ver 2.1", "Bùi Đình Minh Tuê", "đá", "đâs", "ádasd", và "CRM.BLINGKIM".',
    expected: 'Should show intro + bullet list with 6 items'
  },
  {
    name: 'Simple comma list with "và"',
    input: 'Danh sách thành viên: Alice, Bob, Charlie, và David.',
    expected: 'Should show intro + bullet list with 4 items'
  },
  {
    name: 'List with "and"',
    input: 'Your projects: Project A, Project B, and Project C.',
    expected: 'Should show intro + bullet list with 3 items'
  },
  {
    name: 'Regular bullet list',
    input: 'Các task:\n- Task 1\n- Task 2\n- Task 3',
    expected: 'Should show bullet list with 3 items'
  },
  {
    name: 'Numbered list',
    input: 'Các bước:\n1. Bước 1\n2. Bước 2\n3. Bước 3',
    expected: 'Should show numbered list with 3 items'
  }
];

 
