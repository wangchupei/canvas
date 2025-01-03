import React from 'react';

// Main Card Component
export const Card = ({ children, className, ...props }) => (
  <div className={`rounded-md bg-white shadow-lg ${className}`} {...props}>
    {children}
  </div>
);

// Card Header
export const CardHeader = ({ children, className }) => (
  <div className={`p-4 border-b ${className}`}>
    {children}
  </div>
);

// Card Title
export const CardTitle = ({ children, className }) => (
  <h2 className={`text-lg font-semibold ${className}`}>
    {children}
  </h2>
);

// Card Content
export const CardContent = ({ children, className }) => (
  <div className={`p-4 ${className}`}>
    {children}
  </div>
);