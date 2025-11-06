/**
 * @file components/comments/CommentForm.client.js
 * @description A client component form for adding comments using a Server Action.
 */
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useRef } from 'react';
import { addComment } from '@/actions/comment.actions';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const initialState = { success: false, error: null };

function SubmitButton() {
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending}>{pending ? 'Posting...' : 'Post Comment'}</Button>;
}

export function CommentForm({ targetId, targetType }) {
    const [state, formAction] = useFormState(addComment, initialState);
    const formRef = useRef(null);

    useEffect(() => {
        if (state.success) {
            formRef.current?.reset(); // Reset form on successful submission
        }
    }, [state]);

    return (
        <form ref={formRef} action={formAction} className="space-y-3">
            <input type="hidden" name="targetId" value={targetId} />
            <input type="hidden" name="targetType" value={targetType} />
            <Textarea
                name="content"
                placeholder="Write a comment..."
                required
                rows={3}
            />
            {state.error && <p className="text-sm text-red-500">{state.error}</p>}
            <div className="flex justify-end">
                <SubmitButton />
            </div>
        </form>
    );
}
