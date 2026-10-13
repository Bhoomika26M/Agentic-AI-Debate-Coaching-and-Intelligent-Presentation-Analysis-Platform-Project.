import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const UnauthorizedPage = () => {
  return (
    <div className="min-h-screen bg-arena-bg-dark text-arena-parchment flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-arena-opp/15 border border-arena-opp/30 flex items-center justify-center text-arena-opp mb-6">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-serif font-bold text-white mb-2">Access Denied</h1>
      <p className="text-arena-muted max-w-md mb-8 text-sm">
        You do not possess the required chamber clearance or role to view this rostrum.
      </p>
      <Link to="/dashboard">
        <Button variant="primary">Return to Dashboard</Button>
      </Link>
    </div>
  );
};