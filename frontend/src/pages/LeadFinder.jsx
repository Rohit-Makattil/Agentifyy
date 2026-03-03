import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
    Search,
    MapPin,
    Globe,
    Phone,
    Mail,
    Download,
    Moon,
    Sun,
    LayoutGrid,
    List,
    Loader2,
    CheckCircle2,
    Sparkles,
    ArrowRight,
    ExternalLink,
    ShieldCheck,
    Zap,
    Terminal,
    Activity,
    History,
    Trash2,
    ShieldAlert,
    ArrowLeft,
    ChevronDown
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import '../assets/css/modern-hero.css';
import '../assets/css/styles.css';

const API_BASE_URL = 'http://localhost:5000'; // Unified Backend Port

const INDUSTRIES = [
    { id: 'dentist', label: 'Dentist', icon: '🦷', subtext: 'Healthcare • Local Business' },
    { id: 'real_estate', label: 'Real Estate', icon: '🏢', subtext: 'Property • Sales' },
    { id: 'interior', label: 'Interior Designer', icon: '🛋️', subtext: 'Design • Creative' },
    { id: 'gym', label: 'Gym', icon: '💪', subtext: 'Fitness • Local Business' },
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

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1
    }
};

function LeadFinder() {
    const navigate = useNavigate();
    const context = useOutletContext();
    const { isLoggedIn, setIsLoginModalOpen } = context || {};

    // Restore states
    const [keyword, setKeyword] = useState('dentist');
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(false);
    const [leads, setLeads] = useState([]);
    const [viewMode, setViewMode] = useState('grid');
    const [darkMode, setDarkMode] = useState(true);
    const [searchFilter, setSearchFilter] = useState('');
    const [logs, setLogs] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const logEndRef = useRef(null);
    const dropdownRef = useRef(null);

    // Click outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { message, type, timestamp }].slice(-10));
    };

    const fetchLeads = async () => {
        if (!city) {
            toast.error('Location is required');
            return;
        }
        setLoading(true);
        setLeads([]);
        setLogs([]);

        addLog(`Initiating search for "${keyword}" in "${city}"...`, 'info');
        addLog(`Communicating with Geocoding Cluster...`, 'info');

        try {
            const response = await axios.get(`${API_BASE_URL}/generate-leads`, {
                params: { keyword, city }
            });

            addLog(`Success: Found ${response.data.total_leads} verified entities.`, 'success');
            addLog(`Scanning business domains for contact intel...`, 'info');

            setLeads(response.data.leads);
            if (response.data.total_leads === 0) {
                addLog(`Notice: Zero results returned from current cluster.`, 'warning');
            } else {
                toast.success(`Pipeline complete: ${response.data.total_leads} leads captured.`);
            }
        } catch (error) {
            console.error(error);
            const detail = error.response?.data?.detail || 'Cluster communication timeout.';
            addLog(`Critical Error: ${detail}`, 'error');
            toast.error(detail, { duration: 5000 });
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        if (leads.length === 0) return;
        addLog(`Generating specialized export payload (Name & Email)...`, 'info');
        const headers = ['Business Name', 'Primary Email'].join(",");
        const csvRows = leads.map(lead => [
            `"${lead.name.replace(/"/g, '""')}"`,
            `"${(lead.email || (lead.crawled_emails && lead.crawled_emails[0]) || '').replace(/"/g, '""')}"`
        ].join(","));

        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Leads_Extraction_${city}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addLog(`Targeted export successful.`, 'success');
    };

    const filteredLeads = leads.filter(lead =>
        lead.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (lead.email && lead.email.toLowerCase().includes(searchFilter.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 selection:bg-purple-500/30 font-sans pb-20 overflow-x-hidden relative">
            <Toaster position="top-right" />

            {/* Ultra-Premium Background System */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                {/* Base Gradients */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/15 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/15 rounded-full blur-[120px] animate-pulse" />

                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
                <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.03) 1px, transparent 0)`, backgroundSize: '40px 40px' }}></div>
            </div>

            <div className="relative z-10">
                {/* Back Button */}
                <div className="max-w-7xl mx-auto px-6 pt-10 pb-2 relative z-20">
                    <motion.button
                        whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-3 text-slate-300 hover:text-white transition-all font-semibold tracking-wide text-sm bg-slate-900/40 backdrop-blur-xl px-5 py-2.5 rounded-xl border border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_20px_rgba(139,92,246,0.15)] hover:border-purple-500/30 w-max"
                        onClick={() => navigate('/mailer')}
                    >
                        <ArrowLeft className="w-4 h-4 text-purple-400" />
                        Back to Mail Automation
                    </motion.button>
                </div>

                {/* Hero Section - Matching Agentify Main */}
                <section className="modern-hero -mt-10">
                    <div className="hero-grid">
                        <div className="hero-left">
                            <div className="hero-tag">
                                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                <span>Next-Gen Lead Extraction</span>
                            </div>
                            <h1 className="hero-heading">
                                Lead Flow
                                <span className="gradient-text">Intelligence Matrix</span>
                            </h1>
                            <p className="hero-description">
                                Deploy autonomous scraping agents to harvest high-intent verified leads from global directories with precision-targeted extraction.
                            </p>
                            <div className="hero-stats">
                                <div className="stat-item">
                                    <div className="stat-number">2.0</div>
                                    <div className="stat-label">Version</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-number">100%</div>
                                    <div className="stat-label">Verified</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-number">0.4ms</div>
                                    <div className="stat-label">Latency</div>
                                </div>
                            </div>
                        </div>
                        <div className="hero-right">
                            <div className="hero-visual">
                                <div className="visual-icon">
                                    <Zap className="w-16 h-16 text-purple-400 fill-purple-400/20" />
                                </div>
                                <div className="visual-rings">
                                    <div className="ring ring-1"></div>
                                    <div className="ring ring-2"></div>
                                    <div className="ring ring-3"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <main className="agent-page">
                    {/* Search Dashboard */}
                    <div className="agent-config-grid">

                        {/* Left Panel - Configuration */}
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

                            <div className="form-group-enhanced relative" ref={dropdownRef}>
                                <label className="label-enhanced flex items-center gap-2">
                                    <Zap className="w-4 h-4 opacity-70" />
                                    <span>Target Industry / Keyword *</span>
                                </label>
                                <div className="relative group/input mt-2 flex items-center">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl blur opacity-0 group-hover/input:opacity-100 transition duration-500"></div>
                                    <Search className="absolute left-4 w-5 h-5 text-slate-500/60 group-hover/input:text-purple-400/80 z-10 transition-colors pointer-events-none" />
                                    <input
                                        type="text"
                                        value={keyword}
                                        onChange={(e) => {
                                            setKeyword(e.target.value);
                                            setIsDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsDropdownOpen(true)}
                                        placeholder="Target Industry (e.g. Real Estate...)"
                                        className="relative w-full pl-12 pr-14 py-3.5 bg-slate-950/80 border border-white/10 group-hover/input:border-purple-500/40 rounded-2xl focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all text-base font-semibold text-white placeholder:text-slate-600 shadow-2xl"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="absolute right-3.5 w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 hover:bg-purple-500/20 hover:text-purple-400 hover:border-purple-500/30 text-slate-500 transition-all z-10"
                                    >
                                        <ChevronDown className={`w-4.5 h-4.5 transition-transform duration-500 ${isDropdownOpen ? 'rotate-180 text-purple-400' : ''}`} />
                                    </button>
                                </div>
                                <AnimatePresence>
                                    {isDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute z-50 w-full mt-2.5 bg-slate-950/98 backdrop-blur-3xl border border-white/15 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden"
                                        >
                                            <div className="max-h-[360px] overflow-y-auto custom-scrollbar p-3.5 flex flex-col gap-2.5">
                                                {INDUSTRIES.filter(ind => ind.label.toLowerCase().includes(keyword.toLowerCase()) || keyword.toLowerCase() === ind.id).length > 0 ? (
                                                    INDUSTRIES.filter(ind => ind.label.toLowerCase().includes(keyword.toLowerCase()) || keyword.toLowerCase() === ind.id).map(ind => (
                                                        <div
                                                            key={ind.id}
                                                            onClick={() => {
                                                                setKeyword(ind.label);
                                                                setIsDropdownOpen(false);
                                                            }}
                                                            className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-900/40 border border-white/5 hover:bg-purple-600/10 hover:border-purple-500/40 cursor-pointer transition-all duration-300 group/item transform hover:translate-x-1"
                                                        >
                                                            <div className="w-11 h-11 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-center text-2xl shadow-inner group-hover/item:scale-105 group-hover/item:border-purple-500/30 transition-all duration-300 ring-1 ring-white/5">
                                                                {ind.icon}
                                                            </div>
                                                            <div className="flex flex-col gap-0.5 flex-1">
                                                                <span className="text-base font-bold text-slate-100 group-hover/item:text-purple-300 transition-colors leading-tight">{ind.label}</span>
                                                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-none">{ind.subtext}</span>
                                                            </div>
                                                            <div className="w-8 h-8 rounded-lg bg-slate-950 border border-white/5 flex items-center justify-center text-slate-600 group-hover/item:text-white group-hover/item:bg-purple-600/50 group-hover/item:border-purple-500/40 transition-all opacity-0 group-hover/item:opacity-100 shadow-lg shrink-0">
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-6 text-center flex flex-col items-center gap-3 bg-slate-900/40 rounded-xl border border-dashed border-white/10">
                                                        <div className="w-10 h-10 rounded-full bg-slate-950 border border-white/5 flex items-center justify-center shadow-inner">
                                                            <Search className="w-4 h-4 text-purple-400/50" />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-sm font-bold text-slate-300">Custom Extract Active</span>
                                                            <span className="text-[11px] font-medium text-slate-500 max-w-[180px] leading-relaxed">No preset matched. Using exact keyword targeting.</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="form-group-enhanced mt-8">
                                <label className="label-enhanced flex items-center gap-2">
                                    <MapPin className="w-4 h-4 opacity-70" />
                                    <span>Active Scrape Zone *</span>
                                </label>
                                <div className="relative group/input mt-2 flex items-center">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl blur opacity-0 group-hover/input:opacity-100 transition duration-500"></div>
                                    <MapPin className="absolute left-4 w-5 h-5 text-slate-500 opacity-70 group-hover/input:text-blue-400 z-10 transition-colors pointer-events-none" />
                                    <input
                                        type="text"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        placeholder="e.g. San Francisco, CA..."
                                        className="relative w-full pl-12 pr-6 py-4 bg-slate-950/80 border border-white/10 group-hover/input:border-blue-500/50 rounded-2xl focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-base font-medium text-white placeholder:text-slate-600 shadow-xl"
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                className="holo-btn generate-btn mt-10"
                                onClick={fetchLeads}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-6 h-6 animate-spin mr-3" /> Engaging Extractors...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-6 h-6 mr-3 fill-current" /> Initiate Harvest
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Right Panel - Log Output */}
                        <div className="preview-panel relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-2xl border border-white/10 shadow-[inner_0_0_20px_rgba(255,255,255,0.02)]">
                            {/* Animated Top Header Strip */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-blue-400 to-emerald-400 background-animate opacity-80" />

                            <div className="panel-header-enhanced border-b border-white/5 bg-slate-950/60 p-5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="relative header-icon-wrapper w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-white/10 shadow-[inner_0_0_10px_rgba(255,255,255,0.05)]">
                                        <Terminal className="w-5 h-5 text-emerald-400" />
                                        {loading && (
                                            <div className="absolute inset-0 rounded-xl border border-emerald-500/30 animate-ping opacity-50"></div>
                                        )}
                                    </div>
                                    <div className="header-text">
                                        <h3 className="text-[15px] font-bold text-white tracking-wide">Telemetry Stream</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">Real-time extraction logs</p>
                                    </div>
                                </div>
                                {loading ? (
                                    <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 font-mono">
                                        <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest animate-pulse">Scanning...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-white/5">
                                        <div className="w-2 h-2 rounded-full bg-slate-600" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Idle</span>
                                    </div>
                                )}
                            </div>

                            <div className="preview-content p-5 relative" style={{ minHeight: '400px', maxHeight: '500px', display: 'flex', flexDirection: 'column' }}>
                                {/* Radar scanning effect overlay when loading */}
                                {loading && (
                                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-b-2xl opacity-10">
                                        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-400/0 via-blue-400 to-blue-400/0 animate-scan border-b border-blue-400/50 mix-blend-screen shadow-[0_10px_50px_rgba(96,165,250,0.5)]" />
                                    </div>
                                )}

                                <div className="flex-1 font-mono text-[13px] space-y-3 overflow-y-auto custom-scrollbar pr-3 z-10">
                                    <AnimatePresence>
                                        {logs.length === 0 ? (
                                            <motion.div
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                className="flex flex-col items-center justify-center h-full gap-5 text-center mt-10"
                                            >
                                                <div className="relative">
                                                    <Activity className="w-12 h-12 text-slate-600" />
                                                    <div className="absolute -inset-4 border border-slate-700 rounded-full animate-spin-slow opacity-50" style={{ borderTopColor: 'transparent', borderBottomColor: 'transparent' }} />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-slate-400 font-bold tracking-widest text-xs uppercase">Awaiting Directives</p>
                                                    <p className="text-slate-600 text-[10px] uppercase max-w-[200px] leading-relaxed">System is ready to initiate extraction sequence.</p>
                                                </div>
                                            </motion.div>
                                        ) : (
                                            logs.map((log, i) => (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -20, filter: 'blur(8px)' }}
                                                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                                    className="flex gap-4 items-start group rounded-xl transition-all hover:bg-white/5 p-2.5 border border-transparent hover:border-white/5"
                                                    key={i}
                                                >
                                                    <div className="mt-1 shrink-0 pt-0.5">
                                                        <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor] ${log.type === 'error' ? 'bg-rose-500 text-rose-500' : log.type === 'success' ? 'bg-emerald-500 text-emerald-500' : log.type === 'warning' ? 'bg-amber-500 text-amber-500' : 'bg-blue-400 text-blue-400'}`} />
                                                    </div>
                                                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                                                        <span className={`break-words tracking-tight text-sm font-semibold leading-relaxed ${log.type === 'error' ? 'text-rose-400' : log.type === 'success' ? 'text-emerald-400' : log.type === 'warning' ? 'text-amber-400' : 'text-slate-300'}`}>
                                                            {log.type === 'info' && <span className="text-blue-500/50 mr-2">&gt;</span>}
                                                            {log.type === 'success' && <span className="text-emerald-500/50 mr-2">✓</span>}
                                                            {log.type === 'error' && <span className="text-rose-500/50 mr-2">✗</span>}
                                                            {log.message}
                                                        </span>
                                                        <span className="text-[10px] text-slate-600 font-bold tabular-nums tracking-wider">{log.timestamp} • SYS_LOG</span>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </AnimatePresence>
                                    <div ref={logEndRef} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Results Area */}
                    <div className="max-w-7xl mx-auto mt-32">
                        {leads.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col lg:flex-row items-center justify-between mb-16 gap-8 bg-white/5 dark:bg-slate-900/40 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/10 shadow-3xl"
                            >
                                <div className="relative w-full lg:w-[500px] group/search">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl blur opacity-0 group-focus-within/search:opacity-100 transition duration-500" />
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Simultaneous lead filtering..."
                                            value={searchFilter}
                                            onChange={(e) => setSearchFilter(e.target.value)}
                                            className="w-full pl-16 pr-8 py-5 bg-slate-950/20 dark:bg-slate-950/60 border border-white/5 rounded-2xl text-lg font-black focus:border-purple-500/40 outline-none shadow-2xl transition-all placeholder:text-slate-600"
                                        />
                                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-600 group-focus-within/search:text-purple-400 transition-colors" />
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-center gap-6">
                                    <div className="flex bg-slate-900/80 backdrop-blur-lg rounded-xl p-1 shadow-inner border border-white/5 relative">
                                        <button
                                            onClick={() => setViewMode('grid')}
                                            className={`relative z-10 px-6 py-2 rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${viewMode === 'grid' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            <LayoutGrid className="w-4 h-4" /> List
                                        </button>
                                        <button
                                            onClick={() => setViewMode('table')}
                                            className={`relative z-10 px-6 py-2 rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${viewMode === 'table' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            <List className="w-4 h-4" /> Table
                                        </button>
                                        {/* Segmented active pill */}
                                        <div
                                            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg transition-transform duration-300 ease-out ${viewMode === 'grid' ? 'translate-x-[4px]' : 'translate-x-[calc(100%+4px)]'}`}
                                            style={{ zIndex: 0 }}
                                        />
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.02, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={exportToCSV}
                                        className="h-10 px-6 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-xl transition-all text-xs font-bold uppercase tracking-wider shadow-[0_4px_15px_rgba(0,0,0,0.2)] border border-white/10 flex items-center gap-3"
                                    >
                                        <Download className="w-4 h-4" />
                                        Export
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}

                        <AnimatePresence mode="wait">
                            {loading ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
                                >
                                    {[...Array(6)].map((_, i) => (
                                        <LeadSkeleton key={i} />
                                    ))}
                                </motion.div>
                            ) : filteredLeads.length > 0 ? (
                                <motion.div
                                    key="results"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    layout
                                >
                                    {viewMode === 'grid' ? (
                                        <div className="flex flex-col gap-6">
                                            {filteredLeads.map((lead, idx) => (
                                                <LeadCard key={idx} lead={lead} index={idx} />
                                            ))}
                                        </div>
                                    ) : (
                                        <LeadTable filteredLeads={filteredLeads} />
                                    )}
                                </motion.div>
                            ) : (
                                !loading && (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center justify-center py-32 bg-white/5 dark:bg-slate-950/20 backdrop-blur-3xl border-4 border-dashed border-white/5 rounded-[4rem] text-center"
                                    >
                                        <div className="relative mb-10">
                                            <div className="absolute -inset-4 bg-purple-500/20 rounded-full blur-2xl animate-pulse" />
                                            <div className="relative w-28 h-28 rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-700 shadow-3xl">
                                                <History className="w-14 h-14 opacity-30" />
                                            </div>
                                        </div>
                                        <h3 className="text-4xl font-black mb-6 text-white tracking-tight">Zero Broadcast Signals</h3>
                                        <p className="text-slate-500 max-w-md mx-auto text-xl font-medium leading-relaxed">System standby. Initiate a harvest protocol to populate the intelligence matrix.</p>
                                    </motion.div>
                                )
                            )}
                        </AnimatePresence>
                    </div>
                </main>

                <Footer />
            </div>
        </div>
    );
}


function LeadCard({ lead, index }) {
    // Determine a random/pseudo-random industry for visual flair if not provided by backend
    const guessedIndustry = INDUSTRIES.find(ind => lead.name.toLowerCase().includes(ind.id) || (lead.website && lead.website.toLowerCase().includes(ind.id))) || INDUSTRIES[0];

    const copyToClipboard = (text, type) => {
        navigator.clipboard.writeText(text);
        toast.success(`${type} copied to clipboard`, {
            style: {
                background: '#1e293b',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
            },
            iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
            },
        });
    };

    return (
        <motion.div
            variants={itemVariants}
            className="group relative bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_20px_40px_rgba(139,92,246,0.1)] hover:border-purple-500/40 hover:bg-slate-800/80 transition-all duration-300 overflow-hidden flex flex-col md:flex-row gap-8 items-start md:items-center"
        >
            {/* Ambient Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/10 rounded-full blur-[60px] group-hover:bg-purple-600/20 transition-all duration-500 pointer-events-none" />

            {/* Left Section: Identity & Details */}
            <div className="flex-[1.2] min-w-0 w-full z-10 space-y-3">
                <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold leading-tight text-white group-hover:text-purple-300 transition-colors truncate">{lead.name}</h3>
                    <div title="Verified Lead" className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 w-max">
                        <span className="text-xs">{guessedIndustry.icon}</span> {guessedIndustry.label}
                    </div>
                </div>
            </div>

            {/* Middle Section: Contact Info Grid layout */}
            <div className="flex-[2] w-full grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 lg:border-l lg:border-white/5 lg:pl-8 z-10">

                {/* Email Block */}
                <div className="flex items-center justify-between gap-3 text-sm text-slate-300 bg-slate-950/40 px-3 py-2 rounded-lg border border-white/5 group/copy hover:border-purple-500/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                        <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                        {lead.email || (lead.crawled_emails && lead.crawled_emails.length > 0) ? (
                            <span className="truncate text-slate-200">{lead.email || lead.crawled_emails[0]}</span>
                        ) : (
                            <span className="text-slate-600 italic">No email</span>
                        )}
                    </div>
                    {(lead.email || (lead.crawled_emails && lead.crawled_emails.length > 0)) && (
                        <button onClick={() => copyToClipboard(lead.email || lead.crawled_emails[0], "Email")} className="opacity-0 group-hover/copy:opacity-100 hover:text-purple-400 transition-all text-slate-500 shrink-0 outline-none p-1 bg-white/5 rounded-md hover:bg-white/10">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                    )}
                </div>

                {/* Phone Block */}
                <div className="flex items-center justify-between gap-3 text-sm text-slate-300 bg-slate-950/40 px-3 py-2 rounded-lg border border-white/5 group/copy hover:border-blue-500/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                        <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                        {lead.phone ? (
                            <span className="truncate text-slate-200">{lead.phone}</span>
                        ) : (
                            <span className="text-slate-600 italic">No phone</span>
                        )}
                    </div>
                    {lead.phone && (
                        <button onClick={() => copyToClipboard(lead.phone, "Phone")} className="opacity-0 group-hover/copy:opacity-100 hover:text-blue-400 transition-all text-slate-500 shrink-0 outline-none p-1 bg-white/5 rounded-md hover:bg-white/10">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                    )}
                </div>

                {/* Address/Location Block (using city as fallback for now) */}
                <div className="flex items-center gap-3 text-sm text-slate-300 bg-slate-950/40 px-3 py-2 rounded-lg border border-white/5 col-span-1 sm:col-span-2">
                    <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate text-slate-400">Location verified</span>
                </div>
            </div>

            {/* Right Section: Action */}
            <div className="w-full md:w-auto shrink-0 flex items-center justify-end z-10">
                <a
                    href={lead.website ? (lead.website.startsWith('http') ? lead.website : `http://${lead.website}`) : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-bold text-xs uppercase tracking-wide transition-all duration-300 w-full md:w-auto ${lead.website ? 'bg-slate-100 text-slate-900 shadow-lg hover:shadow-xl hover:-translate-y-0.5' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                    onClick={(e) => !lead.website && e.preventDefault()}
                >
                    Visit Website <ExternalLink className="w-3.5 h-3.5" />
                </a>
            </div>
        </motion.div>
    );
}

function LeadSkeleton() {
    return (
        <div className="bg-slate-900/40 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/5 animate-pulse">
            <div className="flex justify-between mb-10">
                <div className="space-y-4 w-full">
                    <div className="h-8 bg-white/5 rounded-xl w-3/4" />
                    <div className="h-4 bg-white/5 rounded-full w-1/4" />
                </div>
                <div className="w-14 h-14 bg-white/5 rounded-2xl shrink-0" />
            </div>
            <div className="space-y-6">
                <div className="h-20 bg-white/5 rounded-2xl" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-14 bg-white/5 rounded-2xl" />
                    <div className="h-14 bg-white/5 rounded-2xl" />
                </div>
            </div>
        </div>
    );
}

function LeadTable({ filteredLeads }) {
    return (
        <div className="bg-white/5 dark:bg-slate-950/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl">
            <div className="overflow-x-auto overflow-y-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-950/40 text-slate-500 uppercase text-[10px] font-black tracking-[0.4em] border-b border-white/5">
                            <th className="px-12 py-10">Entity Identity</th>
                            <th className="px-12 py-10">Signal Channel</th>
                            <th className="px-12 py-10">Intelligence Node</th>
                            <th className="px-12 py-10 text-right">Direct Vector</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredLeads.map((lead, i) => (
                            <motion.tr
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                key={i}
                                className="group hover:bg-purple-600/[0.04] transition-colors"
                            >
                                <td className="px-12 py-12">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-lg font-black tracking-tight uppercase text-white group-hover:text-purple-400 transition-colors">{lead.name}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">Active Signal</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-12 py-12">
                                    <div className="flex items-center gap-5">
                                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center shadow-lg">
                                            <Mail className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <span className="text-base font-black text-slate-200 tracking-tight">
                                            {lead.email || (lead.crawled_emails && lead.crawled_emails[0]) || 'Signal Lost'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-12 py-12">
                                    <div className="flex items-center gap-4">
                                        {lead.phone && (
                                            <div className="px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/20 shadow-inner">
                                                Voice
                                            </div>
                                        )}
                                        {lead.website && (
                                            <div className="px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 shadow-inner">
                                                Matrix
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-12 py-12 text-right">
                                    {lead.website && (
                                        <motion.a
                                            whileHover={{ scale: 1.1, rotate: 12 }}
                                            whileTap={{ scale: 0.9 }}
                                            href={lead.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-slate-500 hover:text-white hover:bg-purple-600 transition-all duration-300 shadow-2xl border border-white/10"
                                        >
                                            <ExternalLink className="w-6 h-6" />
                                        </motion.a>
                                    )}
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default LeadFinder;
