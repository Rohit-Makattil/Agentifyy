import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import axios from 'axios';

function ResponseAnalytics() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        yes: 0,
        no: 0,
        rate: 0
    });

    const SHEET_ID = '1Pffiwu3cI6X6ZXzfDCX5eahMd2wLn5Cu7FsZWFV9mSY';
    const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Responses`;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Use a CORS proxy or fetch directly if allowed (Google Sheets usually allows public CSV)
            const response = await axios.get(CSV_URL);
            parseCSV(response.data);
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError('Failed to load response data. Please check the Google Sheet privacy settings.');
        } finally {
            setLoading(false);
        }
    };

    const parseCSV = (csvText) => {
        const lines = csvText.split('\n');
        const results = [];
        let yesCount = 0;
        let noCount = 0;

        // Skip header line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Handle basic CSV parsing (handle quotes)
            const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, ''));

            if (parts.length >= 3) {
                const entry = {
                    timestamp: parts[0],
                    email: parts[1],
                    response: parts[2].toLowerCase(),
                    campaign: parts[3] || 'N/A'
                };
                results.push(entry);

                if (entry.response === 'yes') yesCount++;
                if (entry.response === 'no') noCount++;
            }
        }

        setData(results.reverse()); // Show latest first
        const total = yesCount + noCount;
        setStats({
            total: results.length,
            yes: yesCount,
            no: noCount,
            rate: total > 0 ? ((yesCount / total) * 100).toFixed(1) : 0
        });
    };

    return (
        <div className="page-wrapper">
            <section className={`analytics-hero ${!isLoggedIn ? 'blur' : ''}`}>
                <div className="container">
                    <div className="section-header fade-in">
                        <span className="section-badge">
                            <i className="fas fa-chart-line"></i> Analytics
                        </span>
                        <h2 className="section-title">Email Response Tracking</h2>
                        <p className="section-subtitle">
                            Real-time insights from your active email campaigns
                        </p>
                    </div>

                    {loading ? (
                        <div className="loading-state">
                            <i className="fas fa-spinner fa-spin"></i>
                            <p>Fetching latest campaign data...</p>
                        </div>
                    ) : error ? (
                        <div className="error-card">
                            <i className="fas fa-exclamation-triangle"></i>
                            <p>{error}</p>
                            <button onClick={fetchData} className="retry-btn">Retry Fetch</button>
                        </div>
                    ) : (
                        <div className="analytics-content fade-in">
                            {/* Stats Grid */}
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-icon yes">
                                        <i className="fas fa-check-circle"></i>
                                    </div>
                                    <div className="stat-info">
                                        <span className="stat-label">Total "Yes"</span>
                                        <h3 className="stat-value">{stats.yes}</h3>
                                        <p className="stat-desc">Interested leads</p>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon no">
                                        <i className="fas fa-times-circle"></i>
                                    </div>
                                    <div className="stat-info">
                                        <span className="stat-label">Total "No"</span>
                                        <h3 className="stat-value">{stats.no}</h3>
                                        <p className="stat-desc">Not interested</p>
                                    </div>
                                </div>

                                <div className="stat-card highlight">
                                    <div className="stat-icon rate">
                                        <i className="fas fa-percentage"></i>
                                    </div>
                                    <div className="stat-info">
                                        <span className="stat-label">Response Rate</span>
                                        <h3 className="stat-value">{stats.rate}%</h3>
                                        <p className="stat-desc">Engagement score</p>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon total">
                                        <i className="fas fa-paper-plane"></i>
                                    </div>
                                    <div className="stat-info">
                                        <span className="stat-label">Total Records</span>
                                        <h3 className="stat-value">{stats.total}</h3>
                                        <p className="stat-desc">Captured interactions</p>
                                    </div>
                                </div>
                            </div>

                            {/* Table Section */}
                            <div className="responses-panel">
                                <div className="panel-header-enhanced">
                                    <div className="header-icon-wrapper">
                                        <i className="fas fa-list-ul"></i>
                                    </div>
                                    <div className="header-text">
                                        <h3>Recent Responses</h3>
                                        <p>Last {data.length} entries from Google Sheets</p>
                                    </div>
                                    <button onClick={fetchData} className="refresh-btn">
                                        <i className="fas fa-sync-alt"></i>
                                    </button>
                                </div>

                                <div className="table-wrapper">
                                    <table className="analytics-table">
                                        <thead>
                                            <tr>
                                                <th>Timestamp</th>
                                                <th>Email Address</th>
                                                <th>Response</th>
                                                <th>Campaign / Subject</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.map((row, idx) => (
                                                <tr key={idx}>
                                                    <td className="time-col">{new Date(row.timestamp).toLocaleString()}</td>
                                                    <td className="email-col">{row.email}</td>
                                                    <td>
                                                        <span className={`response-tag ${row.response}`}>
                                                            {row.response === 'yes' ? '✅ Interested' : '❌ Not Interested'}
                                                        </span>
                                                    </td>
                                                    <td className="campaign-col">{row.campaign}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
            <div className="back-nav" style={{ marginTop: '40px' }}>
                <Link to="/" className="back-link">
                    <i className="fas fa-arrow-left"></i> Back to Dashboard
                </Link>
            </div>
        </div>
    );
}

export default ResponseAnalytics;
