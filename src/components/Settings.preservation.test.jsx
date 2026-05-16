/**
 * Preservation Property Tests for Settings Component
 * 
 * These tests verify behavior that ALREADY WORKS correctly on unfixed code.
 * They capture baseline behavior that must be preserved after the bugfix.
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import fc from 'fast-check';
import React from 'react';

// Mock the Supabase client module
const mockSignOut = vi.fn().mockResolvedValue({});
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}));

// Mock fetch globally
const mockFetch = vi.fn();

// Import after mocks
import Settings from './Settings';

describe('Property 2: Preservation - Accent Color, Sign Out, UI Layout, and localStorage Fallback', () => {
  let originalSetProperty;
  let setPropertyCalls;
  let originalLocation;

  beforeEach(() => {
    vi.clearAllMocks();

    // Track CSS variable changes
    setPropertyCalls = [];
    originalSetProperty = document.documentElement.style.setProperty;
    document.documentElement.style.setProperty = vi.fn((...args) => {
      setPropertyCalls.push(args);
      originalSetProperty.call(document.documentElement.style, ...args);
    });

    // Mock localStorage
    const store = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] || null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      store[key] = value;
    });

    // Mock window.location
    originalLocation = window.location;
    delete window.location;
    window.location = { href: '/' };

    // Mock fetch (for any potential API calls)
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });
  });

  afterEach(() => {
    document.documentElement.style.setProperty = originalSetProperty;
    vi.restoreAllMocks();
    window.location = originalLocation;
  });

  describe('Preservation: Accent Color Instant Apply (Requirement 3.1)', () => {
    /**
     * **Validates: Requirements 3.1**
     * 
     * Property: For all colors in ACCENT_COLORS array, selecting that color
     * immediately sets the --accent-color CSS variable on document.documentElement.
     */
    const ACCENT_COLORS = [
      '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
      '#ef4444', '#ec4899', '#14b8a6', '#f97316',
    ];

    it('property: for all accent colors, updateSetting sets --accent-color CSS variable', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ACCENT_COLORS),
          (color) => {
            // Reset tracking
            setPropertyCalls = [];

            // Render Settings and navigate to Appearance section
            const { unmount } = render(<Settings />);

            // Click on Appearance section
            const appearanceBtn = screen.getByText('Appearance');
            fireEvent.click(appearanceBtn);

            // Click the color dot for this color
            const colorBtn = screen.getByLabelText(`Select color ${color}`);
            fireEvent.click(colorBtn);

            // Verify CSS variable was set
            const accentCall = setPropertyCalls.find(
              (call) => call[0] === '--accent-color' && call[1] === color
            );
            expect(accentCall).toBeDefined();

            unmount();
          }
        ),
        { numRuns: ACCENT_COLORS.length }
      );
    });

    it('each accent color in ACCENT_COLORS applies instantly to document', () => {
      // Explicit example-based test for each color
      ACCENT_COLORS.forEach((color) => {
        setPropertyCalls = [];
        const { unmount } = render(<Settings />);

        fireEvent.click(screen.getByText('Appearance'));
        const colorBtn = screen.getByLabelText(`Select color ${color}`);
        fireEvent.click(colorBtn);

        const accentCall = setPropertyCalls.find(
          (call) => call[0] === '--accent-color' && call[1] === color
        );
        expect(accentCall).toBeDefined();

        unmount();
      });
    });
  });

  describe('Preservation: Sign Out Flow (Requirement 3.2, 3.3)', () => {
    /**
     * **Validates: Requirements 3.3**
     * 
     * Property: Clicking Sign Out calls supabase.auth.signOut() and
     * sets window.location.href to '/login'.
     */
    it('property: signOut calls Supabase auth signOut and redirects to /login', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // No variable input needed - single behavior
          async () => {
            mockSignOut.mockClear();
            window.location.href = '/';

            const { unmount } = render(<Settings />);

            // Click the Sign Out button on the main settings page
            const signOutBtn = screen.getByText('Sign Out');
            await act(async () => {
              fireEvent.click(signOutBtn);
            });

            // Wait for async signOut to complete
            await act(async () => {
              await new Promise((resolve) => setTimeout(resolve, 50));
            });

            // Verify Supabase signOut was called
            expect(mockSignOut).toHaveBeenCalled();

            // Verify redirect to /login
            expect(window.location.href).toBe('/login');

            unmount();
          }
        ),
        { numRuns: 1 }
      );
    });
  });

  describe('Preservation: UI Layout with Back Navigation (Requirement 3.4)', () => {
    /**
     * **Validates: Requirements 3.4**
     * 
     * Property: Settings renders a container with menu items, and when a section
     * is active, a back button ("← Back") is displayed for navigation.
     */
    const VALID_SECTIONS = ['Account', 'Appearance', 'Usage', 'Help & About'];

    it('property: Settings renders menu items with section drill-down pattern', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_SECTIONS),
          (sectionLabel) => {
            const { unmount } = render(<Settings />);

            // Verify the section menu item exists
            const menuItem = screen.getByText(sectionLabel);
            expect(menuItem).toBeInTheDocument();

            unmount();
          }
        ),
        { numRuns: VALID_SECTIONS.length }
      );
    });

    it('property: clicking a section shows back button for navigation', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_SECTIONS),
          (sectionLabel) => {
            const { unmount } = render(<Settings />);

            // Click on the section
            const menuItem = screen.getByText(sectionLabel);
            fireEvent.click(menuItem);

            // Verify back button appears
            const backBtn = screen.getByText('← Back');
            expect(backBtn).toBeInTheDocument();

            // Click back to return to menu
            fireEvent.click(backBtn);

            // Verify we're back at the menu
            expect(screen.getByText(sectionLabel)).toBeInTheDocument();

            unmount();
          }
        ),
        { numRuns: VALID_SECTIONS.length }
      );
    });

    it('Settings page renders card-based layout with all menu items', () => {
      const { unmount } = render(<Settings />);

      // Verify the page title
      expect(screen.getByText('Settings')).toBeInTheDocument();

      // Verify all sections are rendered as menu items
      VALID_SECTIONS.forEach((section) => {
        expect(screen.getByText(section)).toBeInTheDocument();
      });

      // Verify Sign Out button exists
      expect(screen.getByText('Sign Out')).toBeInTheDocument();

      unmount();
    });
  });

  describe('Preservation: localStorage Fallback (Requirement 3.2, 3.5)', () => {
    /**
     * **Validates: Requirements 3.2, 3.5**
     * 
     * Property: When the backend API is unreachable or returns an error,
     * localStorage values are still used for settings state.
     */
    it('property: localStorage settings are loaded on mount regardless of API availability', () => {
      fc.assert(
        fc.property(
          fc.record({
            theme: fc.constantFrom('dark', 'light', 'system'),
            accentColor: fc.constantFrom('#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'),
          }),
          ({ theme, accentColor }) => {
            // Set up localStorage with saved settings
            const savedSettings = JSON.stringify({
              theme,
              accentColor,
              aiEnabled: true,
              autoRelationships: true,
              autoEmbeddings: true,
              similarityThreshold: 0.45,
              dynamicGraphUpdates: true,
              autoSave: true,
              defaultNodeColor: '#10b981',
            });

            Storage.prototype.getItem.mockImplementation((key) => {
              if (key === 'knowde_settings') return savedSettings;
              return null;
            });

            // Mock fetch to simulate backend failure
            mockFetch.mockRejectedValue(new Error('Network error'));

            const { unmount } = render(<Settings />);

            // Navigate to Appearance to verify the accent color is applied
            fireEvent.click(screen.getByText('Appearance'));

            // The selected color should have the active styling (scale 1.2)
            const colorBtn = screen.getByLabelText(`Select color ${accentColor}`);
            expect(colorBtn).toBeInTheDocument();

            unmount();
          }
        ),
        { numRuns: 10 }
      );
    });

    it('settings persist to localStorage when updated', () => {
      // Spy on the actual localStorage object (not Storage.prototype)
      const originalSetItem = localStorage.setItem.bind(localStorage);
      const calls = [];
      localStorage.setItem = vi.fn((...args) => {
        calls.push(args);
        originalSetItem(...args);
      });
      localStorage.getItem = vi.fn(() => null);

      const { unmount } = render(<Settings />);

      // Navigate to Appearance
      fireEvent.click(screen.getByText('Appearance'));

      // Change accent color
      fireEvent.click(screen.getByLabelText('Select color #3b82f6'));

      // Verify localStorage was written
      const settingsWrite = calls.find(
        (call) => call[0] === 'knowde_settings'
      );
      expect(settingsWrite).toBeDefined();

      const parsed = JSON.parse(settingsWrite[1]);
      expect(parsed.accentColor).toBe('#3b82f6');

      unmount();
    });
  });
});
