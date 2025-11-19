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