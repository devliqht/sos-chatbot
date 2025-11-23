'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Route {
  id: string;
  routeName: string;
  description: string;
  endpoint: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('apiKey');
    if (savedKey) {
      setApiKey(savedKey);
      loadRoutes(savedKey);
    }
  }, []);

  const loadRoutes = async (key: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/routes', {
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load routes. Invalid API key?');
      }

      const data = await response.json();
      setRoutes(data.routes);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load routes');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    localStorage.setItem('apiKey', apiKey);
    loadRoutes(apiKey);
  };

  const handleLogout = () => {
    localStorage.removeItem('apiKey');
    setApiKey('');
    setRoutes([]);
    setIsAuthenticated(false);
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/routes/${routeId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete route');
      }

      // Reload routes
      loadRoutes(apiKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete route');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>
              Enter your API key to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="sk_live_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <Button onClick={handleLogin} className="w-full" disabled={!apiKey}>
                Login
              </Button>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="text-sm text-muted-foreground">
                <p>Don&apos;t have an API key?</p>
                <p className="mt-2">
                  Initialize the database at{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">
                    POST /api/admin/init
                  </code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Custom AI Routes</h1>
            <p className="text-muted-foreground">
              Manage your dynamic AI endpoints
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push('/admin/routes/new')}
              variant="default"
            >
              Create New Route
            </Button>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>

        {loading && <p>Loading routes...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {routes.map((route) => (
            <Card key={route.id}>
              <CardHeader>
                <CardTitle className="text-lg">{route.routeName}</CardTitle>
                <CardDescription>{route.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <p className="text-muted-foreground">Endpoint:</p>
                  <code
                    className="bg-muted px-2 py-1 rounded text-xs cursor-pointer hover:bg-muted/80"
                    onClick={() => copyToClipboard(route.endpoint)}
                  >
                    {route.endpoint}
                  </code>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/admin/routes/${route.id}`)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(route.endpoint)}
                  >
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteRoute(route.id)}
                  >
                    Delete
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground pt-2">
                  Created: {new Date(route.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {routes.length === 0 && !loading && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                No custom routes yet. Create your first route to get started!
              </p>
              <Button
                onClick={() => router.push('/admin/routes/new')}
                className="mt-4"
              >
                Create Your First Route
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
