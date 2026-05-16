'use client';

import React, { useState, useEffect } from 'react';
import { User, Palette, BarChart3, HelpCircle, LogOut, ChevronRight, Moon, Sun, Monitor } from 'lucide-react';
import useStore from '@/store/useStore';

// Load settings from localStorage
function loadSettings() {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem('knowde_settings');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

// Save settings to localStorage
function saveSettings(settings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('knowde_settings', JSON.stringify(settings));
}

// Apply theme to document element
function applyTheme(theme) {
  if (typeof window === 'undefined') return;
  if (theme === 'system') {
    const prefersDark = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true; // default to dark if matchMedia unavailable
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

const ACCENT_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316',
];

const Settings = () => {
  const { signOut } = useStore();
  const [settings, setSettings] = useState({
    theme: 'dark',
    accentColor: '#10b981',
  });
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    // Load from localStorage first (instant, prevents flash)
    const saved = loadSettings();
    if (Object.keys(saved).length > 0) {
      setSettings(prev => ({ ...prev, ...saved }));
      // Apply theme from localStorage immediately
      if (saved.theme) {
        applyTheme(saved.theme);
      }
    }

    // Then fetch from backend for cross-device sync
    fetch('/api/settings')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch settings');
        return res.json();
      })
      .then(data => {
        if (data && (data.theme || data.accent_color)) {
          // Backend wins for cross-device sync
          const merged = { ...settings, ...saved };
          if (data.theme) merged.theme = data.theme;
          if (data.accent_color) merged.accentColor = data.accent_color;

          setSettings(merged);
          saveSettings(merged);

          // Apply theme from backend
          if (data.theme) {
            applyTheme(data.theme);
          }
          // Apply accent color from backend
          if (data.accent_color) {
            document.documentElement.style.setProperty('--accent-color', data.accent_color);
          }
        }
      })
      .catch(() => {
        // Silent failure — localStorage fallback is already applied
      });
  }, []);

  const updateSetting = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);

    // Apply theme immediately
    if (key === 'theme') {
      applyTheme(value);
    }

    // Apply accent color immediately
    if (key === 'accentColor') {
      document.documentElement.style.setProperty('--accent-color', value);
    }

    // Fire-and-forget PUT to backend for persistence
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: updated.theme,
        accent_color: updated.accentColor,
      }),
    }).catch(() => {
      // Silent failure — localStorage is the fallback
    });
  };

  const sections = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'usage', label: 'Usage', icon: BarChart3 },
    { id: 'help', label: 'Help & About', icon: HelpCircle },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'account':
        return <AccountSection onSignOut={signOut} />;
      case 'appearance':
        return <AppearanceSection settings={settings} updateSetting={updateSetting} />;
      case 'usage':
        return <UsageSection />;
      case 'help':
        return <HelpSection />;
      default:
        return null;
    }
  };

  if (activeSection) {
    return (
      <div style={styles.container}>
        <div style={styles.sectionPage}>
          <button onClick={() => setActiveSection(null)} style={styles.backBtn}>
            ← Back
          </button>
          <h2 style={styles.sectionTitle}>
            {sections.find(s => s.id === activeSection)?.label}
          </h2>
          {renderSection()}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.pageTitle}>Settings</h2>
      <div style={styles.menuList}>
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            style={styles.menuItem}
          >
            <div style={styles.menuLeft}>
              <section.icon size={20} color="var(--text-muted)" />
              <span style={styles.menuLabel}>{section.label}</span>
            </div>
            <ChevronRight size={16} color="#444" />
          </button>
        ))}
      </div>

      <button onClick={signOut} style={styles.logoutBtn}>
        <LogOut size={18} />
        <span>Sign Out</span>
      </button>
    </div>
  );
};

// --- Sub-sections ---

const AccountSection = ({ onSignOut }) => (
  <div style={styles.sectionContent}>
    <SettingRow label="Email" description="Your login email">
      <span style={styles.valueText}>Connected via Supabase</span>
    </SettingRow>
    <div style={styles.dangerZone}>
      <button onClick={onSignOut} style={styles.dangerBtn}>Sign Out</button>
    </div>
  </div>
);

const AppearanceSection = ({ settings, updateSetting }) => (
  <div style={styles.sectionContent}>
    <SettingRow label="Theme" description="Choose your preferred theme">
      <div style={styles.themeToggle}>
        {[
          { value: 'dark', icon: Moon, label: 'Dark' },
          { value: 'light', icon: Sun, label: 'Light' },
          { value: 'system', icon: Monitor, label: 'System' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => updateSetting('theme', opt.value)}
            style={{
              ...styles.themeBtn,
              ...(settings.theme === opt.value ? styles.themeBtnActive : {}),
            }}
          >
            <opt.icon size={14} />
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    </SettingRow>

    <SettingRow label="Accent Color" description="Primary color for UI elements">
      <div style={styles.colorGrid}>
        {ACCENT_COLORS.map(color => (
          <button
            key={color}
            onClick={() => updateSetting('accentColor', color)}
            style={{
              ...styles.colorDot,
              backgroundColor: color,
              border: settings.accentColor === color ? '2px solid #fff' : '2px solid transparent',
              transform: settings.accentColor === color ? 'scale(1.2)' : 'scale(1)',
            }}
            aria-label={`Select color ${color}`}
          />
        ))}
      </div>
    </SettingRow>
  </div>
);

const UsageSection = () => {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/usage')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load usage data');
        return res.json();
      })
      .then(data => {
        setUsage(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={styles.sectionContent}>
        <p style={styles.usageNote}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.sectionContent}>
        <p style={styles.usageNote}>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.sectionContent}>
      <SettingRow label="Plan" description="Your current subscription">
        <span style={styles.planBadge}>{usage.plan_type || 'free'}</span>
      </SettingRow>
      <SettingRow label="AI Requests" description="Total API calls made">
        <span style={styles.valueText}>{usage.request_count.toLocaleString()}</span>
      </SettingRow>
      <SettingRow label="Total Tokens" description="Total tokens consumed">
        <span style={styles.valueText}>{usage.total_tokens.toLocaleString()}</span>
      </SettingRow>
      <SettingRow label="Embedding Tokens" description="Tokens used for embeddings">
        <span style={styles.valueText}>{usage.embedding_tokens.toLocaleString()}</span>
      </SettingRow>
      <SettingRow label="Chat Tokens" description="Tokens used for chat">
        <span style={styles.valueText}>{usage.chat_tokens.toLocaleString()}</span>
      </SettingRow>
    </div>
  );
};

const HelpSection = () => (
  <div style={styles.sectionContent}>
    <SettingRow label="Version" description="Current app version">
      <span style={styles.valueText}>1.0.0</span>
    </SettingRow>
    <SettingRow label="About" description="Knowde — Visual Knowledge System">
      <span style={styles.valueText}>Phase 4</span>
    </SettingRow>
    <p style={styles.usageNote}>
      Knowde is a workspace-based visual knowledge system with AI-powered semantic relationships.
    </p>
  </div>
);

// --- Reusable components ---

const SettingRow = ({ label, description, children }) => (
  <div style={styles.settingRow}>
    <div style={styles.settingInfo}>
      <span style={styles.settingLabel}>{label}</span>
      {description && <span style={styles.settingDesc}>{description}</span>}
    </div>
    <div style={styles.settingControl}>{children}</div>
  </div>
);

const Toggle = ({ value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    style={{
      ...styles.toggle,
      backgroundColor: value ? 'var(--accent-color)' : '#333',
    }}
    aria-label={value ? 'Enabled' : 'Disabled'}
  >
    <div style={{
      ...styles.toggleKnob,
      transform: value ? 'translateX(18px)' : 'translateX(2px)',
    }} />
  </button>
);

// --- Styles ---

const styles = {
  container: {
    padding: '80px 24px 120px',
    maxWidth: '600px',
    margin: '0 auto',
    color: 'var(--text-color)',
  },
  pageTitle: {
    fontSize: '1.6rem',
    fontWeight: 700,
    marginBottom: '24px',
  },
  menuList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderRadius: '10px',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid #1a1a1a',
    width: '100%',
    textAlign: 'left',
    transition: 'background 0.15s',
  },
  menuLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  menuLabel: {
    fontSize: '0.95rem',
    color: 'var(--text-color)',
    fontWeight: 500,
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px',
    marginTop: '24px',
    borderRadius: '10px',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  sectionPage: {
    paddingTop: '0',
  },
  backBtn: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    marginBottom: '16px',
    padding: '4px 0',
  },
  sectionTitle: {
    fontSize: '1.3rem',
    fontWeight: 600,
    marginBottom: '20px',
  },
  sectionContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  settingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderRadius: '10px',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid #1a1a1a',
    gap: '16px',
  },
  settingInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
  },
  settingLabel: {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: 'var(--text-color)',
  },
  settingDesc: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
  },
  settingControl: {
    flexShrink: 0,
  },
  toggle: {
    width: '40px',
    height: '22px',
    borderRadius: '11px',
    position: 'relative',
    transition: 'background 0.2s',
    border: 'none',
    cursor: 'pointer',
  },
  toggleKnob: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    position: 'absolute',
    top: '2px',
    transition: 'transform 0.2s',
  },
  themeToggle: {
    display: 'flex',
    gap: '4px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    padding: '3px',
  },
  themeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 10px',
    borderRadius: '6px',
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    transition: 'all 0.15s',
  },
  themeBtnActive: {
    backgroundColor: '#333',
    color: '#fff',
  },
  colorGrid: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  colorDot: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'transform 0.15s, border 0.15s',
  },
  slider: {
    width: '100px',
    accentColor: 'var(--accent-color)',
    cursor: 'pointer',
  },
  valueText: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  planBadge: {
    fontSize: '0.72rem',
    padding: '3px 10px',
    borderRadius: '10px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    color: 'var(--accent-color)',
    fontWeight: 500,
  },
  usageNote: {
    fontSize: '0.75rem',
    color: '#555',
    textAlign: 'center',
    marginTop: '16px',
    padding: '0 16px',
  },
  dangerZone: {
    marginTop: '24px',
    padding: '16px',
    borderRadius: '10px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  dangerBtn: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
};

export default Settings;
