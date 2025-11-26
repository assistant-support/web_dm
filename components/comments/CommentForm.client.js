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

export function CommentForm({ targetId, targetType, isActive = true }) {
    const [state, formAction] = useFormState(addComment, initialState);
    const { pending } = useFormStatus();
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
                placeholder={isActive ? 'Write a comment...' : 'Comments disabled (archived)'}
                required
                rows={3}
                disabled={!isActive}
                title={!isActive ? 'Target archived — comments disabled' : undefined}
            />
            {state.error && <p className="text-sm text-red-500">{state.error}</p>}
            <div className="flex justify-end">
                <Button type="submit" disabled={!isActive || pending}>{pending ? 'Posting...' : (isActive ? 'Post Comment' : 'Disabled')}</Button>
            </div>
        </form>
    );
}
