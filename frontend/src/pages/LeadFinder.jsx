import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import {
    Search, MapPin, Globe, Phone, Mail, Download, LayoutGrid, List,
    Loader2, CheckCircle2, Sparkles, ExternalLink, Zap, Terminal,
    Activity, History, ArrowLeft, ChevronDown, ChevronUp, ChevronsUpDown,
    TableIcon
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import '../assets/css/modern-hero.css';
import '../assets/css/styles.css';
import '../assets/css/lead-finder.css';

const API_BASE_URL = 'http://localhost:5000';

const INDUSTRIES = [
    { id: 'dentist', label: 'Dentist', icon: '🦷', subtext: 'Healthcare • Local' },
    { id: 'real_estate', label: 'Real Estate', icon: '🏢', subtext: 'Property • Sales' },
    { id: 'interior', label: 'Interior Designer', icon: '🛋️', subtext: 'Design • Creative' },
    { id: 'gym', label: 'Gym', icon: '💪', subtext: 'Fitness • Local' },
    { id: 'salon', label: 'Salon', icon: '✂️', subtext: 'Beauty • Service' },
    { id: 'restaurant', label: 'Restaurant', icon: '🍽️', subtext: 'Food • Hospitality' },
    { id: 'marketing', label: 'Digital Marketing Agency', icon: '📈', subtext: 'B2B • Services' },
    { id: 'finance', label: 'CA / Finance', icon: '📊', subtext: 'Professional • Finance' },
    { id: 'startup', label: 'Startup', icon: '🚀', subtext: 'Tech • B2B' },
    { id: 'hospital', label: 'Hospital', icon: '🏥', subtext: 'Healthcare • Medical' },
    { id: 'clinic', label: 'Clinic', icon: '🩺', subtext: 'Healthcare • Medical' },
    { id: 'ecommerce', label: 'Ecommerce Brand', icon: '🛒', subtext: 'Retail • Online' },
    { id: 'edtech', label: 'EdTech', icon: '🎓', subtext: 'Education • Technology' },
    { id: 'lawyer', label: 'Lawyer', icon: '⚖️', subtext: 'Legal • Professional' },
    { id: 'architect', label: 'Architect', icon: '🏗️', subtext: 'Design • Construction' },
];

const LOADING_STATUSES = [
    'Extracting data...',
    'Scanning domains...',
    'Verifying intelligence...',
    'Compiling results...',
    'Enriching contacts...',
];

// ─── TypewriterLog: animates a single log entry character-by-character ───────
function TypewriterLog({ text, isNew, onDone }) {
    const [displayed, setDisplayed] = useState('');
    const [done, setDone] = useState(false);
    const idxRef = useRef(0);

    useEffect(() => {
        if (!isNew) { setDisplayed(text); setDone(true); return; }
        idxRef.current = 0;
        setDisplayed('');
        setDone(false);
        const interval = setInterval(() => {
            idxRef.current++;
            setDisplayed(text.slice(0, idxRef.current));
            if (idxRef.current >= text.length) {
                clearInterval(interval);
                setDone(true);
                onDone?.();
            }
        }, 18);
        return () => clearInterval(interval);
    }, [text, isNew]);

    return (
        <span>
            {displayed}
            {!done && <span className="lf-cursor" style={{ color: 'currentColor' }} />}
        </span>
    );
}

// ─── SortIcon helper ──────────────────────────────────────────────────────────
function SortIcon({ field, sortField, sortDir }) {
    if (sortField !== field) return <ChevronsUpDown className="inline w-3 h-3 ml-1 opacity-30" />;
    return sortDir === 'asc'
        ? <ChevronUp className="inline w-3 h-3 ml-1 text-purple-400" />
        : <ChevronDown className="inline w-3 h-3 ml-1 text-purple-400" />;
}

// ─── LeadCard (List/Grid view) ────────────────────────────────────────────────
function LeadCard({ lead, index }) {
    const email = lead.email || (lead.crawled_emails?.[0]) || null;
    const copyEmail = () => {
        if (!email) return;
        navigator.clipboard.writeText(email);
        toast.success('Email copied!', { style: { background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.25 }}
            className="lf-card"
        >
            <div className="lf-card-header">
                <div className="lf-card-name">{lead.name || 'Unknown Business'}</div>
                <div className="lf-card-verified">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div className="lf-card-row">
                    <Mail className="w-3.5 h-3.5" />
                    {email
                        ? <span onClick={copyEmail} style={{ cursor: 'pointer', color: '#a78bfa' }} title="Click to copy">{email}</span>
                        : <span className="lf-muted">No email found</span>
                    }
                </div>
                <div className="lf-card-row">
                    <Phone className="w-3.5 h-3.5" />
                    {lead.phone
                        ? <span>{lead.phone}</span>
                        : <span className="lf-muted">No phone</span>
                    }
                </div>
                <div className="lf-card-row">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Location verified</span>
                </div>
            </div>

            <div className="lf-card-foot">
                {lead.website
                    ? <a href={lead.website.startsWith('http') ? lead.website : `http://${lead.website}`} target="_blank" rel="noopener noreferrer" className="lf-card-link">
                        <ExternalLink className="w-3 h-3" /> Visit Site
                    </a>
                    : <span className="lf-card-link-disabled"><Globe className="w-3 h-3" /> No website</span>
                }
            </div>
        </motion.div>
    );
}

// ─── LeadTable (Table view) ───────────────────────────────────────────────────
function LeadTable({ leads, sortField, sortDir, onSort }) {
    const cols = [
        { key: 'name', label: 'Business Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'website', label: 'Website' },
        { key: 'status', label: 'Status' },
    ];

    return (
        <div className="lf-table-wrap lf-scrollbar">
            <table className="lf-table">
                <thead>
                    <tr>
                        <th className="td-num" style={{ cursor: 'default' }}>#</th>
                        {cols.map(c => (
                            <th key={c.key} onClick={() => onSort(c.key)} className={sortField === c.key ? 'sort-active' : ''}>
                                {c.label}
                                <SortIcon field={c.key} sortField={sortField} sortDir={sortDir} />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {leads.map((lead, i) => {
                        const email = lead.email || lead.crawled_emails?.[0] || null;
                        return (
                            <motion.tr
                                key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.025, duration: 0.2 }}
                            >
                                <td className="td-num">{i + 1}</td>
                                <td className="td-name">{lead.name || '—'}</td>
                                <td>
                                    {email
                                        ? <span style={{ color: '#a78bfa', cursor: 'pointer' }} onClick={() => { navigator.clipboard.writeText(email); toast.success('Copied!'); }}>{email}</span>
                                        : <span className="td-muted">No email</span>
                                    }
                                </td>
                                <td>
                                    {lead.phone
                                        ? <span>{lead.phone}</span>
                                        : <span className="td-muted">No phone</span>
                                    }
                                </td>
                                <td>
                                    {lead.website
                                        ? <a href={lead.website.startsWith('http') ? lead.website : `http://${lead.website}`} target="_blank" rel="noopener noreferrer" className="td-icon-btn" title="Visit website">
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                        : <span className="td-muted">—</span>
                                    }
                                </td>
                                <td>
                                    <span className="td-badge lf-badge-verified">
                                        <CheckCircle2 className="w-3 h-3" /> Verified
                                    </span>
                                </td>
                            </motion.tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ─── LeadSkeleton ─────────────────────────────────────────────────────────────
function LeadSkeleton() {
    return (
        <div className="lf-card" style={{ opacity: 0.5 }}>
            <div style={{ height: 16, background: 'rgba(255,255,255,0.06)', borderRadius: 6, width: '60%', marginBottom: 12 }} />
            <div style={{ height: 11, background: 'rgba(255,255,255,0.04)', borderRadius: 4, width: '80%', marginBottom: 6 }} />
            <div style={{ height: 11, background: 'rgba(255,255,255,0.04)', borderRadius: 4, width: '50%', marginBottom: 6 }} />
            <div style={{ height: 11, background: 'rgba(255,255,255,0.04)', borderRadius: 4, width: '40%' }} />
        </div>
    );
}

// ─── Main LeadFinder Component ────────────────────────────────────────────────
function LeadFinder() {
    const navigate = useNavigate();
    const context = useOutletContext();
    const { isLoggedIn, setIsLoginModalOpen } = context || {};

    const [keyword, setKeyword] = useState('');
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(false);
    const [leads, setLeads] = useState([]);
    const [viewMode, setViewMode] = useState('table');
    const [searchFilter, setSearchFilter] = useState('');
    const [logs, setLogs] = useState([]);
    const [newLogIndex, setNewLogIndex] = useState(-1);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [sortField, setSortField] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [statusIdx, setStatusIdx] = useState(0);

    const logEndRef = useRef(null);
    const dropdownRef = useRef(null);
    const statusIntervalRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Cycle loading status messages
    useEffect(() => {
        if (loading) {
            statusIntervalRef.current = setInterval(() => {
                setStatusIdx(i => (i + 1) % LOADING_STATUSES.length);
            }, 2400);
        } else {
            clearInterval(statusIntervalRef.current);
            setStatusIdx(0);
        }
        return () => clearInterval(statusIntervalRef.current);
    }, [loading]);

    // Auto-scroll log panel
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => {
            const next = [...prev, { message, type, timestamp, id: Date.now() }].slice(-12);
            setNewLogIndex(next.length - 1);
            return next;
        });
    };

    const fetchLeads = async () => {
        if (!city) { toast.error('Location is required'); return; }
        setLoading(true);
        setLeads([]);
        setLogs([]);
        setNewLogIndex(-1);

        addLog(`Initiating search for "${keyword || 'dentist'}" in "${city}"...`, 'info');
        setTimeout(() => addLog('Communicating with Geocoding Cluster...', 'info'), 600);
        setTimeout(() => addLog('Dispatching extraction agents...', 'info'), 1400);

        try {
            const response = await axios.get(`${API_BASE_URL}/generate-leads`, {
                params: { keyword: keyword || 'dentist', city }
            });

            addLog(`Found ${response.data.total_leads} verified entities.`, 'success');
            setTimeout(() => addLog('Scanning business domains for contact intel...', 'info'), 400);
            setTimeout(() => addLog('Pipeline complete. Results ready.', 'success'), 900);

            setLeads(response.data.leads);
            if (response.data.total_leads === 0) {
                addLog('Notice: Zero results returned from cluster.', 'warning');
            } else {
                toast.success(`${response.data.total_leads} leads captured!`, {
                    style: { background: '#1e293b', color: '#fff' }
                });
            }
        } catch (error) {
            const detail = error.response?.data?.detail || 'Cluster communication timeout.';
            addLog(`Critical Error: ${detail}`, 'error');
            toast.error(detail, { duration: 5000 });
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (field) => {
        setSortDir(prev => (sortField === field && prev === 'asc') ? 'desc' : 'asc');
        setSortField(field);
    };

    const exportToCSV = () => {
        if (!filteredLeads.length) return;
        const headers = ['#', 'Business Name', 'Email', 'Phone', 'Website', 'Status'];
        const rows = filteredLeads.map((lead, i) => [
            i + 1,
            `"${(lead.name || '').replace(/"/g, '""')}"`,
            `"${(lead.email || lead.crawled_emails?.[0] || '').replace(/"/g, '""')}"`,
            `"${(lead.phone || '').replace(/"/g, '""')}"`,
            `"${(lead.website || '').replace(/"/g, '""')}"`,
            'Verified',
        ].join(','));
        const csvContent = [headers.join(','), ...rows].join('\n');

        // Use a Blob instead of data URI for robust downloading
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `Leads_${city}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();

        // Clean up
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);

        toast.success('Export complete!', { style: { background: '#1e293b', color: '#fff' } });
        addLog('CSV export complete.', 'success');
    };

    const filteredLeads = leads
        .filter(lead =>
            (lead.name || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
            (lead.email || '').toLowerCase().includes(searchFilter.toLowerCase())
        )
        .sort((a, b) => {
            const av = (a[sortField] || '').toString().toLowerCase();
            const bv = (b[sortField] || '').toString().toLowerCase();
            return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        });

    const filteredIndustries = INDUSTRIES.filter(ind =>
        !keyword || ind.label.toLowerCase().includes(keyword.toLowerCase())
    );

    return (
        <div className="lead-finder-container relative">
            <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

            {/* Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/15 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/15 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.03) 1px, transparent 0)`, backgroundSize: '40px 40px' }} />
            </div>

            <div className="relative z-10">
                {/* Back Button */}
                <div className="max-w-7xl mx-auto px-6 pt-10 pb-2 relative z-20">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-3 text-slate-300 hover:text-white transition-all font-semibold tracking-wide text-sm bg-slate-900/40 backdrop-blur-xl px-5 py-2.5 rounded-xl border border-white/10 hover:border-purple-500/30 w-max"
                        onClick={() => navigate('/mailer')}
                    >
                        <ArrowLeft className="w-4 h-4 text-purple-400" />
                        Back to Mail Automation
                    </motion.button>
                </div>

                {/* Hero */}
                <section className={`modern-hero ${!isLoggedIn ? 'blur' : ''}`} style={{ marginTop: '-40px' }}>
                    <div className="hero-grid">
                        <div className="hero-left">
                            <div className="hero-tag">
                                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                <span>Next-Gen Lead Extraction</span>
                            </div>
                            <h1 className="hero-heading">
                                Lead Flow
                                <span className="gradient-text"> Intelligence Matrix</span>
                            </h1>
                            <p className="hero-description">
                                Deploy autonomous scraping agents to harvest high-intent verified leads with precision-targeted extraction.
                            </p>
                            <div className="hero-stats">
                                <div className="stat-item"><div className="stat-number">2.0</div><div className="stat-label">Version</div></div>
                                <div className="stat-item"><div className="stat-number">100%</div><div className="stat-label">Verified</div></div>
                                <div className="stat-item"><div className="stat-number">0.4ms</div><div className="stat-label">Latency</div></div>
                            </div>
                        </div>
                        <div className="hero-right">
                            <div className="hero-visual">
                                <div className="visual-icon">
                                    <Zap className="w-16 h-16 text-purple-400 fill-purple-400/20" />
                                </div>
                                <div className="visual-rings">
                                    <div className="ring ring-1" /><div className="ring ring-2" /><div className="ring ring-3" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Main */}
                <main className={`agent-page ${!isLoggedIn ? 'blur' : ''}`}>
                    <div className="agent-config-grid">

                        {/* ── Left Panel ─────────────────────────── */}
                        <div className="agent-form-container">
                            <div className="panel-header-enhanced">
                                <div className="header-icon-wrapper">
                                    <Search className="w-5 h-5 text-purple-400" />
                                </div>
                                <div className="header-text">
                                    <h3>Targeting Protocol</h3>
                                    <p>Configure your lead extraction parameters</p>
                                </div>
                            </div>

                            {/* Industry Dropdown */}
                            <div className="form-group-enhanced" style={{ position: 'relative' }} ref={dropdownRef}>
                                <label className="label-enhanced flex items-center gap-2">
                                    <Zap className="w-4 h-4 opacity-70" />
                                    <span>Target Industry / Keyword *</span>
                                </label>
                                <div style={{ position: 'relative', marginTop: 8 }}>
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none z-10" />
                                    <input
                                        type="text"
                                        value={keyword}
                                        onChange={e => { setKeyword(e.target.value); setIsDropdownOpen(true); }}
                                        onFocus={() => setIsDropdownOpen(true)}
                                        placeholder="Type industry (e.g. Dentist, Gym...)"
                                        className="relative w-full pl-10 pr-10 py-3 bg-slate-950/80 border border-white/10 rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all text-sm font-semibold text-white placeholder:text-slate-600"
                                        style={{ zIndex: 1 }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsDropdownOpen(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-purple-400 transition-colors z-10"
                                    >
                                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-purple-400' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {isDropdownOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -6 }}
                                                transition={{ duration: 0.15 }}
                                                className="lf-dropdown lf-scrollbar"
                                            >
                                                {filteredIndustries.length > 0 ? filteredIndustries.map(ind => (
                                                    <div
                                                        key={ind.id}
                                                        className="lf-dropdown-item"
                                                        onClick={() => { setKeyword(ind.label); setIsDropdownOpen(false); }}
                                                    >
                                                        <div className="lf-dropdown-icon">{ind.icon}</div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div className="lf-dropdown-label">{ind.label}</div>
                                                            <div className="lf-dropdown-sub">{ind.subtext}</div>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="lf-dropdown-empty">
                                                        Custom keyword — exact targeting active
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* City Input */}
                            <div className="form-group-enhanced" style={{ marginTop: 20 }}>
                                <label className="label-enhanced flex items-center gap-2">
                                    <MapPin className="w-4 h-4 opacity-70" />
                                    <span>Active Scrape Zone *</span>
                                </label>
                                <div style={{ position: 'relative', marginTop: 8 }}>
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none z-10" />
                                    <input
                                        type="text"
                                        value={city}
                                        onChange={e => setCity(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && fetchLeads()}
                                        placeholder="e.g. San Francisco, CA..."
                                        className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-white/10 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-medium text-white placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            {/* Launch Button */}
                            <button
                                type="button"
                                className="holo-btn generate-btn"
                                style={{ marginTop: 24 }}
                                onClick={fetchLeads}
                                disabled={loading}
                            >
                                {loading
                                    ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Engaging Extractors...</>
                                    : <><Zap className="w-5 h-5 mr-2 fill-current" /> Initiate Harvest</>
                                }
                            </button>
                        </div>

                        {/* ── Right Panel (Telemetry) ─────────────── */}
                        <div className="preview-panel relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-2xl border border-white/10">
                            {/* Animated header strip */}
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-blue-400 to-emerald-400" />

                            {/* Panel header */}
                            <div className="panel-header-enhanced border-b border-white/5 bg-slate-950/60 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="relative header-icon-wrapper w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center border border-white/10">
                                        <Terminal className="w-4 h-4 text-emerald-400" />
                                        {loading && <div className="absolute inset-0 rounded-xl border border-emerald-500/40 animate-ping opacity-40" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-[14px] font-bold text-white">Telemetry Stream</h3>
                                            {loading && (
                                                <span className="flex gap-1 items-center">
                                                    <span className="lf-dot bg-blue-400" />
                                                    <span className="lf-dot bg-blue-400" />
                                                    <span className="lf-dot bg-blue-400" />
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">Real-time extraction logs</p>
                                    </div>
                                </div>
                                {loading ? (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                                        <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                                        <span key={statusIdx} className="text-[10px] font-bold text-blue-400 uppercase tracking-widest lf-status-cycle">
                                            {LOADING_STATUSES[statusIdx]}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-white/5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Idle</span>
                                    </div>
                                )}
                            </div>

                            {/* Log content */}
                            <div className="preview-content p-4 relative" style={{ minHeight: 380, maxHeight: 480, display: 'flex', flexDirection: 'column' }}>
                                {loading && (
                                    <div className="lf-scan-overlay">
                                        <div className="lf-scan-line" />
                                    </div>
                                )}

                                <div className="flex-1 font-mono text-[12px] overflow-y-auto lf-scrollbar pr-1 z-10" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <AnimatePresence>
                                        {logs.length === 0 ? (
                                            <motion.div
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                className="flex flex-col items-center justify-center h-full gap-4 text-center mt-8"
                                            >
                                                <div className="relative">
                                                    <Activity className="w-10 h-10 text-slate-700" />
                                                    <div className="absolute -inset-3 border border-slate-800 rounded-full animate-spin opacity-40" style={{ borderTopColor: 'transparent' }} />
                                                </div>
                                                <div>
                                                    <p className="text-slate-500 font-bold tracking-widest text-[10px] uppercase">Awaiting Directives</p>
                                                    <p className="text-slate-700 text-[9px] uppercase mt-1">Ready to initiate extraction sequence</p>
                                                </div>
                                            </motion.div>
                                        ) : (
                                            logs.map((log, i) => {
                                                const colorMap = { error: '#f87171', success: '#34d399', warning: '#fbbf24', info: '#94a3b8' };
                                                const dotColor = { error: '#f87171', success: '#34d399', warning: '#fbbf24', info: '#60a5fa' };
                                                const prefixMap = { info: '> ', success: '✓ ', error: '✗ ', warning: '! ' };
                                                const isNew = i === newLogIndex;
                                                return (
                                                    <motion.div
                                                        key={log.id}
                                                        initial={{ opacity: 0, x: -12 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className={isNew ? 'lf-log-entry-new' : ''}
                                                        style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '5px 6px', borderRadius: 6 }}
                                                    >
                                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor[log.type], flexShrink: 0, marginTop: 3, boxShadow: `0 0 6px ${dotColor[log.type]}` }} />
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <span style={{ color: colorMap[log.type], fontWeight: 600, lineHeight: 1.5 }}>
                                                                <span style={{ opacity: 0.5 }}>{prefixMap[log.type]}</span>
                                                                <TypewriterLog text={log.message} isNew={isNew} />
                                                            </span>
                                                            <div style={{ fontSize: 9, color: '#3f4865', marginTop: 1, letterSpacing: '0.05em' }}>{log.timestamp} • SYS_LOG</div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })
                                        )}
                                    </AnimatePresence>
                                    <div ref={logEndRef} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Results Area ──────────────────────── */}
                    <div style={{ marginTop: 48 }}>
                        {/* Controls bar */}
                        {leads.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="lf-controls-bar"
                            >
                                <div className="lf-controls-left">
                                    <div className="lf-search-wrap">
                                        <Search className="lf-search-icon w-3.5 h-3.5" />
                                        <input
                                            type="text"
                                            placeholder="Filter leads..."
                                            value={searchFilter}
                                            onChange={e => setSearchFilter(e.target.value)}
                                            className="lf-search-input"
                                        />
                                    </div>
                                    <div className="lf-count-badge">
                                        <Zap className="w-3 h-3" />
                                        {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div className="lf-toggle-bar">
                                        <button
                                            className={`lf-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                                            onClick={() => setViewMode('table')}
                                        >
                                            <TableIcon className="w-3.5 h-3.5" /> Table
                                        </button>
                                        <button
                                            className={`lf-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                            onClick={() => setViewMode('grid')}
                                        >
                                            <LayoutGrid className="w-3.5 h-3.5" /> List
                                        </button>
                                    </div>
                                    <button className="lf-export-btn" onClick={exportToCSV}>
                                        <Download className="w-3.5 h-3.5" /> Export
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Results */}
                        <AnimatePresence mode="wait">
                            {loading ? (
                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="lf-card-grid">
                                    {[...Array(6)].map((_, i) => <LeadSkeleton key={i} />)}
                                </motion.div>
                            ) : filteredLeads.length > 0 ? (
                                <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    {viewMode === 'table'
                                        ? <LeadTable leads={filteredLeads} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                        : <div className="lf-card-grid">
                                            {filteredLeads.map((lead, i) => <LeadCard key={i} lead={lead} index={i} />)}
                                        </div>
                                    }
                                </motion.div>
                            ) : !loading && (
                                <motion.div key="empty" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center py-24 bg-white/2 dark:bg-slate-950/20 backdrop-blur-3xl border-2 border-dashed border-white/5 rounded-3xl text-center"
                                >
                                    <div className="relative mb-8">
                                        <div className="absolute -inset-4 bg-purple-500/10 rounded-full blur-2xl animate-pulse" />
                                        <div className="relative w-20 h-20 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center">
                                            <History className="w-10 h-10 text-slate-700 opacity-40" />
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-black mb-3 text-white">Zero Broadcast Signals</h3>
                                    <p className="text-slate-500 max-w-sm mx-auto text-sm">Initiate a harvest protocol to populate the intelligence matrix.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </main>

                <div className="back-nav" style={{ marginTop: 40, paddingBottom: 40 }}>
                    <Link to="/" className="back-link">
                        <i className="fas fa-arrow-left" /> Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default LeadFinder;
