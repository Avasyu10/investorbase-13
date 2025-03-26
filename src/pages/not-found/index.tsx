
import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-2xl mb-6">Page not found</p>
      <Link to="/" className="text-blue-500 hover:underline">
        Return to home
      </Link>
    </div>
  );
}
