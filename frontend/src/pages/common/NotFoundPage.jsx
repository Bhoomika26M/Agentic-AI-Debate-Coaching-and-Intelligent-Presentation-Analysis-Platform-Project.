import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-arena-bg-dark text-arena-parchment flex flex-col items-center justify-center p-6 text-center">
      <span className="text-6xl font-serif font-bold text-arena-amber mb-4">404</span>
      <h1 className="text-2xl font-serif font-bold text-white mb-2">Chamber Not Found</h1>
      <p className="text-arena-muted max-w-md mb-8 text-sm">
        The debate motion or room you are looking for does not exist or has concluded.
      </p>
      <Link to="/dashboard">
        <Button variant="primary">Return Home</Button>
      </Link>
    </div>
  );
};
