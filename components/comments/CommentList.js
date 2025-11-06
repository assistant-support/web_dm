/**
 * @file components/comments/CommentList.js
 * @description Server Component to display a list of comments.
 */
import CommentItem from './CommentItem.client';

/**
 * Renders a list of comments.
 * @param {{ initialComments: Array<object> }} props
 * @returns {JSX.Element}
 */
export default function CommentList({ initialComments = [] }) {
    if (initialComments.length === 0) {
        return (
            <p className="text-sm text-gray-500 text-center py-4">
                Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {initialComments.map((comment) => (
                <CommentItem key={comment._id} comment={comment} />
            ))}
        </div>
    );
}
