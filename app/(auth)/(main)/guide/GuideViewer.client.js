/*
 * Đường dẫn: @/app/(auth)/(main)/guide/GuideViewer.client.js
 * Mô tả: Component hiển thị tài liệu hướng dẫn, hỗ trợ cấu trúc Section linh hoạt (Text, Steps, Image, Video, Note), tìm kiếm và Glossary.
 */

'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Image from 'next/image';
import { Search, BookOpen, ChevronRight, PlayCircle, Info, CheckCircle2, X, BookMarked, Menu, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';

// --- Helpers ---

const removeAccents = (str) => {
    if (!str) return '';
    return str.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .toLowerCase();
};

const parseInlineNodes = (text, glossary, onLinkClick) => {
    if (!text) return null;
    const regex = /(`.*?`|\[.*?\]\(ref:.*?\)|(?<!\*)\*\*.*?\*\*(?!\*)|\*.*?\*)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={index} className="bg-gray-100 text-red-600 font-mono text-xs px-1.5 py-0.5 rounded border border-gray-200 mx-1">{part.slice(1, -1)}</code>;
        }
        if (part.startsWith('[') && part.includes('](ref:')) {
            const match = part.match(/\[(.*?)\]\(ref:(.*?)\)/);
            if (match) {
                const [_, label, key] = match;
                if (glossary && onLinkClick && glossary[key]) {
                    return (
                        <button key={index} onClick={(e) => { e.stopPropagation(); onLinkClick(glossary[key]); }}
                            className="inline-flex items-center gap-1 mx-1 text-blue-600 font-bold hover:text-blue-800 hover:underline decoration-blue-300 underline-offset-4 transition-all cursor-pointer bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 align-middle text-xs md:text-sm"
                            title="Xem giải thích">
                            <BookMarked className="w-3.5 h-3.5" />{label}
                        </button>
                    );
                }
                return <strong key={index} className="text-blue-600">{label}</strong>;
            }
        }
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={index} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*')) return <em key={index} className="italic text-gray-600">{part.slice(1, -1)}</em>;
        return part;
    });
};

const formatText = (text, glossary, onLinkClick) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;
        if (trimmed.startsWith('- ')) {
            return (
                <div key={idx} className="flex items-start gap-2 mb-1.5 pl-2 md:pl-4">
                    <span className="mt-2 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                    <span className="text-gray-700 leading-relaxed">
                        {parseInlineNodes(trimmed.slice(2), glossary, onLinkClick)}
                    </span>
                </div>
            );
        }
        return (
            <p key={idx} className="mb-2 text-gray-700 leading-relaxed whitespace-pre-line">
                {parseInlineNodes(line, glossary, onLinkClick)}
            </p>
        );
    });
};

// --- Sub-Components for Section Types ---

const TextSection = ({ content, glossary, onLinkClick }) => (
    <div className="text-gray-700 leading-relaxed text-sm lg:text-base">
        {formatText(content, glossary, onLinkClick)}
    </div>
);

const StepsSection = ({ title, items, glossary, onLinkClick, guideId, sectionIdx }) => (
    <div className="mt-4 mb-6">
        {title && <h3 className="text-base lg:text-lg font-bold text-gray-800 mb-4">{title}</h3>}
        <div className="space-y-4">
            {items.map((item, idx) => (
                <div key={idx} id={`step-${guideId}-${sectionIdx}-${idx}`} className="scroll-mt-36 group bg-white rounded-lg border border-gray-100 p-4 hover:border-blue-200 transition-colors shadow-sm">
                    <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100 flex-shrink-0 mt-0.5">
                            {idx + 1}
                        </span>
                        <div>
                            <h4 className="font-bold text-gray-900 mb-1 group-hover:text-blue-700 transition-colors">
                                {parseInlineNodes(item.title, glossary, onLinkClick)}
                            </h4>
                            <div className="text-sm text-gray-600">
                                {formatText(item.content, glossary, onLinkClick)}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const MediaSection = ({ src, type, caption }) => {
    // Helper: Tự động xử lý link Google Drive để chạy được trong iframe
    const getEmbedUrl = (inputUrl) => {
        if (!inputUrl) return '';

        // Trường hợp 1: Input là ID (ví dụ: 1UDN9xr0iri7zCvoHZQvA-Enbq-gb2nON)
        if (!inputUrl.includes('/') && !inputUrl.includes('.')) {
            return `https://drive.google.com/file/d/${inputUrl}/preview`;
        }

        // Trường hợp 2: Input là Link thường (view/edit) -> chuyển sang preview
        // Regex bắt ID nằm giữa /d/ và /
        const match = inputUrl.match(/\/d\/(.+?)(\/|$)/);
        if (match && match[1]) {
            return `https://drive.google.com/file/d/${match[1]}/preview`;
        }

        // Trường hợp 3: Đã là link chuẩn hoặc link Youtube/nguồn khác
        return inputUrl;
    };

    return (
        <div className="my-6">
            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-900 relative flex justify-center bg-gray-100">
                {type === 'video' ? (
                    <div className="w-full aspect-video bg-black">
                        <iframe
                            src={getEmbedUrl(src)}
                            className="w-full h-full border-0"
                            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                            allowFullScreen
                            loading="lazy" // Tối ưu hiệu suất tải trang
                            title={caption || "Video player"}
                        />
                    </div>
                ) : (
                    <div className="relative w-full max-h-[500px]" style={{ height: 'auto' }}>
                      <Image
                        src={src}
                        alt={caption || 'Minh họa'}
                        width={0}
                        height={0}
                        sizes="100vw"
                        className="w-full h-auto max-h-[500px] object-contain" 
                    />
                    </div>
                )}
            </div>
            {caption && (
                <p className="text-center text-xs text-gray-500 mt-2 italic flex items-center justify-center gap-1">
                    <Info className="w-3 h-3" /> {caption}
                </p>
            )}
        </div>
    );
};

const NoteSection = ({ content, variant = 'info', glossary, onLinkClick }) => {
    const styles = {
        info: { bg: 'bg-blue-50', border: 'border-blue-100', icon: Info, text: 'text-blue-900', iconColor: 'text-blue-600' },
        warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle, text: 'text-amber-900', iconColor: 'text-amber-600' }
    };
    const style = styles[variant] || styles.info;
    const Icon = style.icon;

    return (
        <div className={`my-6 p-4 rounded-lg border ${style.bg} ${style.border} flex gap-3`}>
            <div className="flex-shrink-0 pt-0.5">
                <Icon className={`w-5 h-5 ${style.iconColor}`} />
            </div>
            <div className={`text-sm leading-relaxed ${style.text}`}>
                {formatText(content, glossary, onLinkClick)}
            </div>
        </div>
    );
};

// --- Main Components ---

const GlossaryModal = ({ item, onClose }) => {
    if (!item) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="bg-blue-50 p-3 md:p-4 border-b border-blue-100 flex justify-between items-start">
                    <div className="flex items-center gap-2 text-blue-800 font-bold text-base md:text-lg">
                        <BookMarked className="w-5 h-5" />
                        {item.title}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-blue-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 md:p-6 text-gray-800 text-sm leading-relaxed max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {formatText(item.content)}
                </div>
                <div className="bg-gray-50 p-3 md:p-4 text-right border-t border-gray-100">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm">
                        Đã hiểu
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function GuideViewer({ data = [], glossary = {} }) {
    const [activeTabId, setActiveTabId] = useState(data?.[0]?.id ?? null);
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeGlossary, setActiveGlossary] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const contentRef = useRef(null);
    const searchContainerRef = useRef(null);

    const activeGuide = useMemo(() => data.find(d => d.id === activeTabId) || data[0] || null, [data, activeTabId]);

    useEffect(() => {
        if (!activeTabId && data?.length) setActiveTabId(data[0].id);
    }, [data, activeTabId]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Search logic updated for Sections structure
    useEffect(() => {
        const rawQuery = (query || '').trim();
        if (!rawQuery) { setSuggestions([]); return; }

        const normalizedQuery = removeAccents(rawQuery);
        const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
        const results = [];
        const seen = new Set();

        for (const guide of data) {
            // Check title
            if (tokens.every(token => removeAccents(guide.title || '').includes(token))) {
                if (!seen.has(`guide:${guide.id}`)) {
                    results.push({ type: 'title', id: guide.id, label: guide.title, score: 10 });
                    seen.add(`guide:${guide.id}`);
                }
            }

            // Check sections
            guide.sections?.forEach((section, sIdx) => {
                if (section.type === 'steps') {
                    section.items?.forEach((item, iIdx) => {
                        const content = (item.title || '') + ' ' + (item.content || '');
                        if (tokens.every(token => removeAccents(content).includes(token))) {
                            const key = `step:${guide.id}:${sIdx}:${iIdx}`;
                            if (!seen.has(key)) {
                                results.push({
                                    type: 'step',
                                    id: guide.id,
                                    label: `${guide.title} — ${item.title}`,
                                    elementId: `step-${guide.id}-${sIdx}-${iIdx}`,
                                    score: 5
                                });
                                seen.add(key);
                            }
                        }
                    });
                } else if (section.type === 'text' || section.type === 'note') {
                    if (tokens.every(token => removeAccents(section.content || '').includes(token))) {
                        const key = `section:${guide.id}:${sIdx}`;
                        if (!seen.has(key)) {
                            results.push({
                                type: 'content',
                                id: guide.id,
                                label: `${guide.title} (Nội dung)`,
                                elementId: null, // Scroll to top of guide
                                score: 3
                            });
                            seen.add(key);
                        }
                    }
                }
            });
            if (results.length >= 15) break;
        }
        setSuggestions(results.sort((a, b) => b.score - a.score).slice(0, 8));
        setShowSuggestions(true);
    }, [query, data]);

    const scrollToElement = (guideId, elementId) => {
        setActiveTabId(guideId);
        setIsMobileMenuOpen(false);
        if (elementId) {
            setTimeout(() => {
                const el = document.getElementById(elementId);
                if (el && contentRef.current) {
                    const headerOffset = 100;
                    contentRef.current.scrollTo({
                        top: el.offsetTop - headerOffset,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        } else {
            if (contentRef.current) contentRef.current.scrollTop = 0;
        }
    };

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg w-full flex-1 overflow-hidden flex flex-col lg:flex-row h-full shadow-sm relative">
            {/* Mobile Header */}
            <div className="lg:hidden bg-white border-b border-gray-200 p-3 flex items-center justify-between sticky top-0 z-40">
                <h2 className="font-bold text-gray-800 flex items-center gap-2 truncate text-sm">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    {activeGuide ? activeGuide.title : 'Hướng dẫn'}
                </h2>
                <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 rounded-md hover:bg-gray-100 text-gray-600">
                    <Menu className="w-5 h-5" />
                </button>
            </div>

            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none
                lg:relative lg:translate-x-0 lg:w-72 xl:w-80 lg:bg-gray-50/50 lg:z-0 lg:flex flex-col
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-4 bg-white flex justify-between items-center">
                    <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        Mục lục hệ thống
                    </h2>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar bg-white">
                    {data.map(item => (
                        <button
                            key={item.id}
                            onClick={() => { setActiveTabId(item.id); setIsMobileMenuOpen(false); if (contentRef.current) contentRef.current.scrollTop = 0; }}
                            className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm group relative flex justify-between items-center ${item.id === activeTabId
                                ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm border border-blue-100'
                                : 'text-gray-600 hover:bg-white hover:shadow-sm hover:text-gray-900 border border-transparent'
                                }`}
                        >
                            <span className="block line-clamp-2">{item.title}</span>
                            {item.id === activeTabId && <ChevronRight className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                        </button>
                    ))}
                </div>
            </aside>

            {/* Main Content */}
            <div className="bg-white flex flex-1 overflow-hidden w-full lg:rounded-lg flex-col">
                <main ref={contentRef} className="flex-1 overflow-y-auto relative scroll-smooth bg-white">
                    {/* Search Bar */}
                    <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 px-4 lg:px-6 py-2.5 border-b border-gray-100">
                        <div className="relative max-w-3xl w-full mx-auto" ref={searchContainerRef}>
                            <Input
                                value={query}
                                onChange={e => {
                                    setQuery(e.target.value);
                                    if (!showSuggestions && e.target.value.trim()) setShowSuggestions(true);
                                }}
                                onFocus={() => { if (query.trim()) setShowSuggestions(true); }}
                                placeholder="Tìm kiếm hướng dẫn..."
                                leftIcon={<Search className="w-4 h-4" />}
                                className="text-sm h-10"
                            />
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-lg shadow-xl z-40 max-h-80 overflow-auto divide-y divide-gray-50 animate-in fade-in zoom-in-95 duration-100">
                                    {suggestions.map((s, idx) => (
                                        <button key={idx} onClick={() => { setShowSuggestions(false); scrollToElement(s.id, s.elementId); }}
                                            className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors group">
                                            <span className={`block text-sm ${s.type === 'title' ? "font-bold text-gray-800" : "text-gray-600 group-hover:text-blue-700"}`}>
                                                {s.label}
                                            </span>
                                            {s.type !== 'title' && (
                                                <span className="text-xs text-gray-400 mt-0.5 block ml-2 flex items-center gap-1">
                                                    <ChevronRight className="w-3 h-3" /> Chi tiết
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content Rendering */}
                    <div className="p-6 min-h-[500px] max-w-4xl mx-auto">
                        {activeGuide ? (
                            <article className="animate-in fade-in duration-500 pb-10">
                                <header className="mb-6 lg:mb-8 pb-4 border-b border-gray-100">
                                    <h1 className="text-xl lg:text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
                                        {activeGuide.title}
                                    </h1>
                                    <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-500 bg-gray-50 w-fit px-3 py-1 rounded-full border border-gray-100">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                        <span>Cập nhật: {new Date(activeGuide.updatedAt).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                </header>

                                {/* Flexible Sections Loop */}
                                <div className="space-y-2">
                                    {activeGuide.sections?.map((section, idx) => {
                                        switch (section.type) {
                                            case 'text':
                                                return <TextSection key={idx} content={section.content} glossary={glossary} onLinkClick={setActiveGlossary} />;
                                            case 'steps':
                                                return <StepsSection key={idx} guideId={activeGuide.id} sectionIdx={idx} title={section.title} items={section.items} glossary={glossary} onLinkClick={setActiveGlossary} />;
                                            case 'image':
                                            case 'video':
                                                return <MediaSection key={idx} src={section.src} type={section.type} caption={section.caption} />;
                                            case 'note':
                                                return <NoteSection key={idx} variant={section.variant} content={section.content} glossary={glossary} onLinkClick={setActiveGlossary} />;
                                            default:
                                                return null;
                                        }
                                    })}
                                </div>
                            </article>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 lg:h-96 text-gray-400">
                                <Search className="w-12 h-12 lg:w-16 lg:h-16 mb-4 opacity-10" />
                                <p className="text-base lg:text-lg font-medium">Chọn một mục từ menu.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {activeGlossary && <GlossaryModal item={activeGlossary} onClose={() => setActiveGlossary(null)} />}
        </div>
    );
}