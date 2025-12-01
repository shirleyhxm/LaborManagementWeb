/**
 * Centralized color theme configuration for the application
 *
 * This file contains all color constants used throughout the application
 * to ensure consistency and make it easy to update the color scheme.
 */

export const COLORS = {
  // Shift colors
  shift: {
    regular: {
      background: '#eff6ff',  // blue-50
      border: '#93c5fd',      // blue-300
      hover: '#dbeafe'        // blue-100
    },
    overtime: {
      background: '#f3e8ff',  // purple-50
      border: '#c084fc',      // purple-400
      hover: '#e9d5ff'        // purple-200
    }
  },

  // Status/Alert colors
  status: {
    info: {
      background: '#eff6ff',  // blue-50
      border: '#bfdbfe',      // blue-200
      text: '#1e40af',        // blue-700
      light: '#dbeafe'        // blue-100
    },
    success: {
      background: '#f0fdf4',  // green-50
      border: '#bbf7d0',      // green-200
      text: '#15803d',        // green-700
      light: '#dcfce7'        // green-100
    },
    warning: {
      background: '#fefce8',  // yellow-50
      border: '#fef08a',      // yellow-200
      text: '#a16207',        // yellow-700
      light: '#fef9c3'        // yellow-100
    },
    error: {
      background: '#fef2f2',  // red-50
      border: '#fecaca',      // red-200
      text: '#b91c1c',        // red-700
      light: '#fee2e2'        // red-100
    },
    amber: {
      background: '#fffbeb',  // amber-50
      border: '#fde68a',      // amber-200
      text: '#d97706',        // amber-700
      light: '#fef3c7'        // amber-100
    },
    orange: {
      background: '#fff7ed',  // orange-50
      border: '#fed7aa',      // orange-200
      text: '#c2410c',        // orange-700
      light: '#ffedd5'        // orange-100
    },
    purple: {
      background: '#faf5ff',  // purple-50
      border: '#e9d5ff',      // purple-200
      text: '#7e22ce',        // purple-700
      light: '#f3e8ff'        // purple-100
    }
  },

  // Neutral colors
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717'
  },

  // Primary colors
  primary: {
    50: '#eff6ff',
    600: '#2563eb'
  },

  // Table borders
  table: {
    border: 'rgb(212, 212, 212)',  // neutral-300
    borderWidth: '4px'
  },

  // Drag & Drop states
  dragDrop: {
    valid: {
      background: '#dcfce7',    // green-100
      border: '#4ade80'         // green-400
    },
    invalid: {
      background: '#fee2e2',    // red-100
      border: '#f87171'         // red-400
    },
    preview: {
      background: '#bbf7d0',    // green-200
      border: '#4ade80'         // green-400
    }
  }
} as const;

/**
 * Helper function to get table border style
 */
export const getTableBorderStyle = () => {
  return `${COLORS.table.borderWidth} solid ${COLORS.table.border}`;
};