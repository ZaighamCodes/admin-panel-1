'use client';

import React from 'react';

export default function Table({ columns, data, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-primary-50 to-purple-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider ${
                    column.className || ''
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {!data || !Array.isArray(data) || data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                if (!row) return null;
                return (
                  <tr key={row.id || row.tipId || row.advertisementId || row.doctorId || row.departmentId || row.qualificationId || rowIndex} className="hover:bg-primary-50/50 transition-colors">
                    {columns.map((column, index) => {
                      try {
                        return (
                          <td
                            key={index}
                            className={`px-6 py-4 whitespace-nowrap text-sm text-gray-700 ${
                              column.className || ''
                            }`}
                          >
                            {typeof column.accessor === 'function'
                              ? column.accessor(row) || '-'
                              : String(row[column.accessor] || '-')}
                          </td>
                        );
                      } catch (error) {
                        return (
                          <td key={index} className="px-6 py-4 text-sm text-gray-500">
                            -
                          </td>
                        );
                      }
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

