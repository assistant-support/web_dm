"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import TeamCard from './TeamCard.js';
import TeamListItem from './TeamListItem.js';
import ViewModeToggle from './ViewModeToggle.client.js';

export default function TeamsClientList({ teams = [], currentUserId, currentUser, initialView = 'card', serverRootId = 'teams-server-root', controlsRootId = 'teams-client-controls-root' }) {
    const [viewMode, setViewMode] = useState(initialView || 'card');
    const [mounted, setMounted] = useState(false);

    // Keep original server HTML so we can restore it when switching back
    const origHtmlRef = useRef(null);

    useEffect(() => {
        setMounted(true);
        const root = document.getElementById(serverRootId);
        if (root && origHtmlRef.current === null) {
            origHtmlRef.current = root.innerHTML;
        }
    }, [serverRootId]);

    const mountedRootRef = useRef(null);

    const ClientRenderedView = ({ view, teams }) => {
        if (view === 'list') {
            return (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="divide-y divide-gray-200">
                        {teams.map(team => (
                            <TeamListItem key={team._id} team={team} currentUserId={currentUserId} currentUser={currentUser} />
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ">
                {teams.map(team => (
                    <TeamCard key={team._id || team.id} team={team} currentUserId={currentUserId} currentUser={currentUser} />
                ))}
            </div>
        );
    };

    const handleChange = (v) => {
        // Update the local view mode immediately for snappy UI
        setViewMode(v);

        if (!mounted) {
            return;
        }

        const root = document.getElementById(serverRootId);
        if (!root) return;

        // If switching back to initial view, unmount any client root and restore server HTML
        if (v === initialView) {
            if (mountedRootRef.current) {
                try { mountedRootRef.current.unmount(); } catch (e) { console.error(e); }
                mountedRootRef.current = null;
            }
            root.innerHTML = origHtmlRef.current || '';
            setViewMode(v);
            return;
        }

        // Otherwise, mount a client React tree into the server root
        // If already mounted, just re-render by calling render again
        if (!mountedRootRef.current) {
            const cr = createRoot(root);
            mountedRootRef.current = cr;
            cr.render(<ClientRenderedView view={v} teams={teams} />);
        } else {
            try {
                mountedRootRef.current.render(<ClientRenderedView view={v} teams={teams} />);
            } catch (e) {
                console.error('Failed to render into existing root, remounting', e);
                try { mountedRootRef.current.unmount(); } catch (err) { }
                const cr = createRoot(root);
                mountedRootRef.current = cr;
                cr.render(<ClientRenderedView view={v} teams={teams} />);
            }
        }
        // viewMode already updated above
    };

    useEffect(() => {
        return () => {
            const root = document.getElementById(serverRootId);
            if (mountedRootRef.current) {
                try { mountedRootRef.current.unmount(); } catch (e) { }
                mountedRootRef.current = null;
            }
            if (root && origHtmlRef.current !== null) {
                root.innerHTML = origHtmlRef.current;
            }
        };
    }, [serverRootId]);

    // Controls element to render (can be portaled into the header)
    const controls = (
        <div className="flex items-center justify-between">
            <ViewModeToggle value={viewMode} onChange={handleChange} />
        </div>
    );

    // Try to portal controls into the provided header container when mounted
    if (mounted) {
        const controlsRoot = document.getElementById(controlsRootId);
        if (controlsRoot) {
            // Render controls into header via portal and render nothing locally
            return createPortal(controls, controlsRoot);
        }
    }

    // Fallback: render controls inline above list
    if (!teams || teams.length === 0) {
        return controls;
    }

    return (
        <div className="w-full">
            {controls}
        </div>
    );
}

// Minimal HTML escaper
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
